import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth.middleware'
import { prisma } from '../config/prisma'
import { z } from 'zod'
import { Errors } from '../utils/errors'

const CreateFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
})

export async function folderRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const { parentId } = request.query as { parentId?: string }

    const folders = await prisma.folder.findMany({
      where: { userId: user.sub, parentId: parentId ?? null },
      include: { _count: { select: { files: true, children: true } } },
      orderBy: { name: 'asc' },
    })

    return reply.send({ success: true, data: folders })
  })

  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const parsed = CreateFolderSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    if (parsed.data.parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parsed.data.parentId, userId: user.sub },
      })
      if (!parent) {
        const err = Errors.folderNotFound()
        return reply.code(err.statusCode).send({
          success: false,
          code: err.code,
          message: err.message,
        })
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: parsed.data.name,
        userId: user.sub,
        parentId: parsed.data.parentId ?? null,
      },
    })

    return reply.code(201).send({ success: true, data: folder })
  })

  fastify.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user as { sub: string }
    const { id } = request.params as { id: string }

    const folder = await prisma.folder.findFirst({
      where: { id, userId: user.sub },
      include: { _count: { select: { files: true, children: true } } },
    })

    if (!folder) {
      const err = Errors.folderNotFound()
      return reply.code(err.statusCode).send({
        success: false,
        code: err.code,
        message: err.message,
      })
    }

    if (folder._count.files > 0 || folder._count.children > 0) {
      const err = Errors.folderNotEmpty()
      return reply.code(err.statusCode).send({
        success: false,
        code: err.code,
        message: err.message,
      })
    }

    await prisma.folder.delete({ where: { id } })
    return reply.send({ success: true, message: 'Dossier supprimé' })
  })
}
