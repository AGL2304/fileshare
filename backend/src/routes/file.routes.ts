import { FastifyInstance, FastifyRequest } from 'fastify'
import { authenticate } from '../middleware/auth.middleware'
import {
  uploadFile,
  listFiles,
  getFileById,
  deleteFile,
  getDownloadStream,
  FileListQuerySchema,
} from '../services/file.service'
import { config } from '../config'
import { AppError } from '../utils/errors'

export async function fileRoutes(fastify: FastifyInstance) {
  // POST /api/v1/files — upload
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }

    const data = await (request as FastifyRequest & { file: () => Promise<any> }).file({
      limits: { fileSize: config.upload.maxFileSizeBytes },
    })

    if (!data) {
      return reply.code(400).send({
        success: false,
        code: 'NO_FILE',
        message: 'Aucun fichier fourni',
      })
    }

    const folderId = (request.query as { folderId?: string }).folderId

    try {
      const file = await uploadFile(data, user.sub, folderId)
      return reply.code(201).send({
        success: true,
        data: { ...file, sizeBytes: file.sizeBytes.toString() },
        message: 'Fichier uploadé avec succès',
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

  // GET /api/v1/files — list
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const parsed = FileListQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    const result = await listFiles(user.sub, parsed.data)
    return reply.send({ success: true, ...result })
  })

  // GET /api/v1/files/:id — metadata
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const { id } = request.params as { id: string }

    try {
      const file = await getFileById(id, user.sub)
      return reply.send({ success: true, data: file })
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

  // GET /api/v1/files/:id/download
  fastify.get('/:id/download', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const { id } = request.params as { id: string }

    try {
      const { stream, file } = await getDownloadStream(id, user.sub)
      return reply
        .header('Content-Type', file.mimeType)
        .header(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(file.originalName)}"`
        )
        .header('Content-Length', file.sizeBytes.toString())
        .send(stream)
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

  // DELETE /api/v1/files/:id
  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const { id } = request.params as { id: string }

    try {
      await deleteFile(id, user.sub)
      return reply.send({ success: true, message: 'Fichier supprimé' })
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
