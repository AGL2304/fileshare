import { FastifyInstance } from 'fastify'
import {
  RegisterSchema,
  LoginSchema,
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
} from '../services/auth.service'
import { authenticate } from '../middleware/auth.middleware'
import { prisma } from '../config/prisma'
import { AppError } from '../utils/errors'

export async function authRoutes(fastify: FastifyInstance) {
  // Tighter rate-limit for credential endpoints
  const credentialLimit = {
    rateLimit: { max: 10, timeWindow: '5 minutes' },
  }

  // POST /api/v1/auth/register
  fastify.post('/register', { config: credentialLimit }, async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Données invalides',
        errors: parsed.error.flatten().fieldErrors,
      })
    }

    try {
      const user = await registerUser(parsed.data)
      return reply.code(201).send({
        success: true,
        data: user,
        message: 'Compte créé avec succès',
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

  // POST /api/v1/auth/login
  fastify.post('/login', { config: credentialLimit }, async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(422).send({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Email ou mot de passe manquant',
      })
    }

    try {
      const result = await loginUser(parsed.data, fastify)
      return reply.send({ success: true, data: result })
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

  // POST /api/v1/auth/refresh
  fastify.post(
    '/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: { refreshToken: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string }

      try {
        const tokens = await refreshTokens(refreshToken, fastify)
        return reply.send({ success: true, data: tokens })
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

  // DELETE /api/v1/auth/logout
  fastify.delete('/logout', { preHandler: authenticate }, async (request, reply) => {
    const { refreshToken } = (request.body as { refreshToken?: string } | null) ?? {}
    if (refreshToken) await logoutUser(refreshToken)
    return reply.send({ success: true, message: 'Déconnexion réussie' })
  })

  // GET /api/v1/auth/me
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const jwtUser = request.user as { sub: string }

    const user = await prisma.user.findUnique({
      where: { id: jwtUser.sub },
      select: {
        id: true,
        email: true,
        name: true,
        avatarKey: true,
        role: true,
        quotaBytes: true,
        usedBytes: true,
        createdAt: true,
      },
    })

    if (!user) {
      return reply.code(404).send({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable',
      })
    }

    return reply.send({
      success: true,
      data: {
        ...user,
        avatarUrl: user.avatarKey ? `/api/v1/profile/avatar/${user.id}` : null,
        quotaBytes: user.quotaBytes.toString(),
        usedBytes: user.usedBytes.toString(),
      },
    })
  })
}
