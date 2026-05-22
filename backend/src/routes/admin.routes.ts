import { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../middleware/auth.middleware'
import {
  getGlobalStats,
  getSystemInfo,
  listUsers,
  getUserDetail,
  updateUser,
  deleteUser,
  listAllFiles,
  purgeFile,
  listAllShares,
  revokeShareAdmin,
  listAccessLogs,
  UserListQuerySchema,
  UpdateUserSchema,
  FileAdminListQuerySchema,
  AccessLogQuerySchema,
} from '../services/admin.service'
import { AppError } from '../utils/errors'

const adminOnly = { preHandler: requireRole('ADMIN') }

function handleErr(reply: FastifyReply, err: unknown) {
  if (err instanceof AppError) {
    return reply.code(err.statusCode).send({
      success: false,
      code: err.code,
      message: err.message,
    })
  }
  throw err
}

export async function adminRoutes(fastify: FastifyInstance) {
  // GET /api/v1/admin/stats — global metrics
  fastify.get('/stats', adminOnly, async () => {
    const stats = await getGlobalStats()
    return { success: true, data: stats }
  })

  // GET /api/v1/admin/system — server + db info
  fastify.get('/system', adminOnly, async () => {
    const info = await getSystemInfo()
    return { success: true, data: info }
  })

  // ─── Users ────────────────────────────────────────────────────────────
  fastify.get('/users', adminOnly, async (request, reply) => {
    const parsed = UserListQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }
    const result = await listUsers(parsed.data)
    return { success: true, ...result }
  })

  fastify.get('/users/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      const user = await getUserDetail(id)
      return { success: true, data: user }
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  fastify.patch('/users/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateUserSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    // Prevent admin from demoting / suspending themselves
    const me = request.user as { sub: string }
    if (me.sub === id && (parsed.data.isActive === false || parsed.data.role && parsed.data.role !== 'ADMIN')) {
      return reply.code(409).send({
        success: false,
        code: 'SELF_PROTECTION',
        message: "Vous ne pouvez pas modifier votre propre rôle ou vous désactiver",
      })
    }

    try {
      const user = await updateUser(id, parsed.data)
      return reply.send({ success: true, data: user })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  fastify.delete('/users/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    const me = request.user as { sub: string }
    if (me.sub === id) {
      return reply.code(409).send({
        success: false,
        code: 'SELF_PROTECTION',
        message: 'Vous ne pouvez pas supprimer votre propre compte',
      })
    }
    try {
      const result = await deleteUser(id)
      return reply.send({ success: true, data: result })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  // ─── Files ────────────────────────────────────────────────────────────
  fastify.get('/files', adminOnly, async (request, reply) => {
    const parsed = FileAdminListQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }
    const result = await listAllFiles(parsed.data)
    return { success: true, ...result }
  })

  fastify.delete('/files/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await purgeFile(id)
      return reply.send({ success: true, message: 'Fichier purgé définitivement' })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  // ─── Shares ───────────────────────────────────────────────────────────
  const ShareListSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    activeOnly: z.coerce.boolean().optional(),
  })

  fastify.get('/shares', adminOnly, async (request, reply) => {
    const parsed = ShareListSchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }
    const result = await listAllShares(parsed.data)
    return { success: true, ...result }
  })

  fastify.delete('/shares/:id', adminOnly, async (request, reply) => {
    const { id } = request.params as { id: string }
    try {
      await revokeShareAdmin(id)
      return reply.send({ success: true, message: 'Lien révoqué' })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  // ─── Access logs ──────────────────────────────────────────────────────
  fastify.get('/access-logs', adminOnly, async (request, reply) => {
    const parsed = AccessLogQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }
    const result = await listAccessLogs(parsed.data)
    return { success: true, ...result }
  })
}
