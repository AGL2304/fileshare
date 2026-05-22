import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { authenticate } from '../middleware/auth.middleware'
import {
  UpdateEmailSchema,
  ChangePasswordSchema,
  UpdateNameSchema,
  updateEmail,
  changePassword,
  updateName,
  uploadAvatar,
  deleteAvatar,
  getAvatarStream,
} from '../services/profile.service'
import { AppError } from '../utils/errors'

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

export async function profileRoutes(fastify: FastifyInstance) {
  // PATCH /api/v1/profile/email
  fastify.patch('/email', { preHandler: authenticate }, async (request, reply) => {
    const me = request.user as { sub: string }
    const parsed = UpdateEmailSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }
    try {
      const result = await updateEmail(me.sub, parsed.data)
      return reply.send({
        success: true,
        data: result,
        message: 'Email mis à jour. Vous devez vous reconnecter.',
      })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  // PATCH /api/v1/profile/password
  fastify.patch('/password', { preHandler: authenticate }, async (request, reply) => {
    const me = request.user as { sub: string }
    const parsed = ChangePasswordSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }
    try {
      await changePassword(me.sub, parsed.data)
      return reply.send({
        success: true,
        message: 'Mot de passe mis à jour. Vous devez vous reconnecter.',
      })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  // PATCH /api/v1/profile/name
  fastify.patch('/name', { preHandler: authenticate }, async (request, reply) => {
    const me = request.user as { sub: string }
    const parsed = UpdateNameSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }
    try {
      const result = await updateName(me.sub, parsed.data)
      return reply.send({ success: true, data: result })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  // POST /api/v1/profile/avatar (multipart)
  fastify.post('/avatar', { preHandler: authenticate }, async (request, reply) => {
    const me = request.user as { sub: string }

    const data = await (request as FastifyRequest & { file: () => Promise<unknown> }).file({
      limits: { fileSize: 2 * 1024 * 1024 },
    })

    if (!data) {
      return reply.code(400).send({
        success: false,
        code: 'NO_FILE',
        message: 'Aucun fichier fourni',
      })
    }

    try {
      const result = await uploadAvatar(me.sub, data as Parameters<typeof uploadAvatar>[1])
      return reply.code(201).send({
        success: true,
        data: result,
        message: 'Avatar mis à jour',
      })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  // DELETE /api/v1/profile/avatar
  fastify.delete('/avatar', { preHandler: authenticate }, async (request, reply) => {
    const me = request.user as { sub: string }
    try {
      await deleteAvatar(me.sub)
      return reply.send({ success: true, message: 'Avatar supprimé' })
    } catch (err) {
      return handleErr(reply, err)
    }
  })

  // GET /api/v1/profile/avatar/:userId — public (avatar is not sensitive)
  fastify.get('/avatar/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string }
    try {
      const { stream, mime } = await getAvatarStream(userId)
      return reply
        .header('Content-Type', mime)
        .header('Cache-Control', 'private, max-age=300')
        .send(stream)
    } catch (err) {
      return handleErr(reply, err)
    }
  })
}
