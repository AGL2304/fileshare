import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.middleware'
import {
  CreateShareSchema,
  createShare,
  resolveShare,
  getShareDownloadUrl,
  listUserShares,
  revokeShare,
} from '../services/share.service'
import { getDownloadStream } from '../services/file.service'
import { AppError } from '../utils/errors'

function readSharePassword(
  body: unknown,
  headers: Record<string, string | string[] | undefined>
): string | undefined {
  // Prefer body, fallback to X-Share-Password header. NEVER read from query string.
  const fromBody =
    body && typeof body === 'object' && 'password' in body
      ? (body as { password?: unknown }).password
      : undefined
  if (typeof fromBody === 'string' && fromBody.length > 0) return fromBody

  const hdr = headers['x-share-password']
  if (typeof hdr === 'string' && hdr.length > 0) return hdr
  return undefined
}

export async function shareRoutes(fastify: FastifyInstance) {
  // POST /api/v1/shares — create share link (auth)
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const parsed = CreateShareSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    try {
      const share = await createShare(parsed.data, user.sub)
      return reply.code(201).send({ success: true, data: share })
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({
          success: false,
          code: err.code,
          message: err.message,
        })
      }
      throw err
    }
  })

  // GET /api/v1/shares — list my shares (auth)
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const shares = await listUserShares(user.sub)
    return reply.send({ success: true, data: shares })
  })

  // POST /api/v1/shares/:token/resolve — public: get share info (password in body or header)
  fastify.post(
    '/:token/resolve',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { token } = request.params as { token: string }
      const password = readSharePassword(request.body, request.headers)

      try {
        const { share, file } = await resolveShare(token, password)
        return reply.send({
          success: true,
          data: {
            id: share.id,
            permission: share.permission,
            expiresAt: share.expiresAt,
            downloadCount: share.downloadCount,
            maxDownloads: share.maxDownloads,
            hasPassword: !!share.passwordHash,
            file: {
              name: file.name,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
            },
          },
        })
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.statusCode).send({
            success: false,
            code: err.code,
            message: err.message,
          })
        }
        throw err
      }
    }
  )

  // GET /api/v1/shares/:token — quick info without password challenge (returns 401 if password)
  fastify.get('/:token', async (request, reply) => {
    const { token } = request.params as { token: string }
    try {
      const { share, file } = await resolveShare(token, undefined)
      return reply.send({
        success: true,
        data: {
          id: share.id,
          permission: share.permission,
          expiresAt: share.expiresAt,
          downloadCount: share.downloadCount,
          maxDownloads: share.maxDownloads,
          hasPassword: !!share.passwordHash,
          file: {
            name: file.name,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
          },
        },
      })
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({
          success: false,
          code: err.code,
          message: err.message,
        })
      }
      throw err
    }
  })

  // POST /api/v1/shares/:token/download — public: stream the file
  fastify.post(
    '/:token/download',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const { token } = request.params as { token: string }
      const password = readSharePassword(request.body, request.headers)

      try {
        const { downloadUrl, file } = await getShareDownloadUrl(
          token,
          password,
          request.ip,
          request.headers['user-agent']
        )

        if (downloadUrl.includes('/internal/storage/')) {
          const { stream } = await getDownloadStream(file.id)
          return reply
            .header('Content-Type', file.mimeType)
            .header(
              'Content-Disposition',
              `attachment; filename="${encodeURIComponent(file.name)}"`
            )
            .send(stream)
        }

        return reply.redirect(downloadUrl, 302)
      } catch (err) {
        if (err instanceof AppError) {
          return reply.code(err.statusCode).send({
            success: false,
            code: err.code,
            message: err.message,
          })
        }
        throw err
      }
    }
  )

  // DELETE /api/v1/shares/:id — revoke (auth)
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const { id } = request.params as { id: string }

    try {
      await revokeShare(id, user.sub)
      return reply.send({ success: true, message: 'Lien révoqué' })
    } catch (err) {
      if (err instanceof AppError) {
        return reply.code(err.statusCode).send({
          success: false,
          code: err.code,
          message: err.message,
        })
      }
      throw err
    }
  })
}
