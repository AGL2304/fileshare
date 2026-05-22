import 'dotenv/config'
import Fastify, { FastifyInstance } from 'fastify'
import fastifyJwt from '@fastify/jwt'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyMultipart from '@fastify/multipart'
import fastifyRateLimit from '@fastify/rate-limit'
import { config } from './config'
import { prisma } from './config/prisma'
import { authRoutes } from './routes/auth.routes'
import { fileRoutes } from './routes/file.routes'
import { shareRoutes } from './routes/share.routes'
import { folderRoutes } from './routes/folder.routes'
import { adminRoutes } from './routes/admin.routes'
import { profileRoutes } from './routes/profile.routes'
import { existsSync } from 'fs'
import { mkdir } from 'fs/promises'
import { AppError } from './utils/errors'

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger:
      config.server.nodeEnv === 'development'
        ? { level: 'info', transport: { target: 'pino-pretty' } }
        : { level: 'warn' },
    trustProxy: true,
    bodyLimit: 1024 * 1024, // 1MB for JSON; multipart has its own limit
  })

  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: false, // SPA handles its own CSP via nginx
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  await fastify.register(fastifyCors, {
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await fastify.register(fastifyJwt, { secret: config.jwt.secret })

  await fastify.register(fastifyMultipart, {
    limits: { fileSize: config.upload.maxFileSizeBytes, files: 1 },
  })

  await fastify.register(fastifyRateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      code: 'RATE_LIMITED',
      message: 'Trop de requêtes, réessayez dans une minute',
    }),
  })

  fastify.decorate('prisma', prisma)

  // ── Health checks ────────────────────────────────────────────────────
  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: config.server.nodeEnv,
  }))

  fastify.get('/ready', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'ready' }
    } catch {
      return reply.code(503).send({ status: 'not-ready' })
    }
  })

  // ── Routes ───────────────────────────────────────────────────────────
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  await fastify.register(fileRoutes, { prefix: '/api/v1/files' })
  await fastify.register(shareRoutes, { prefix: '/api/v1/shares' })
  await fastify.register(folderRoutes, { prefix: '/api/v1/folders' })
  await fastify.register(profileRoutes, { prefix: '/api/v1/profile' })
  await fastify.register(adminRoutes, { prefix: '/api/v1/admin' })

  // ── Global error handler ─────────────────────────────────────────────
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        code: error.code,
        message: error.message,
      })
    }

    fastify.log.error(error)

    if (error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
      return reply.code(415).send({
        success: false,
        code: 'INVALID_MEDIA_TYPE',
        message: 'Type de contenu non supporté',
      })
    }

    if (error.code === 'FST_ERR_REQ_FILE_TOO_LARGE') {
      return reply.code(413).send({
        success: false,
        code: 'FILE_TOO_LARGE',
        message: 'Fichier trop volumineux',
      })
    }

    if (error.statusCode === 429) {
      return reply.code(429).send({
        success: false,
        code: 'RATE_LIMITED',
        message: 'Trop de requêtes',
      })
    }

    return reply.code(error.statusCode ?? 500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message:
        config.server.nodeEnv === 'development'
          ? error.message
          : 'Erreur interne du serveur',
    })
  })

  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      code: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} introuvable`,
    })
  })

  return fastify
}

// ─── Start ────────────────────────────────────────────────────────────

async function main() {
  if (config.storage.type === 'local' && !existsSync(config.storage.localPath)) {
    await mkdir(config.storage.localPath, { recursive: true })
  }

  const app = await buildApp()

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down...`)
    try {
      await app.close()
      await prisma.$disconnect()
      process.exit(0)
    } catch (err) {
      app.log.error(err)
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))

  try {
    await app.listen({ port: config.server.port, host: config.server.host })
    app.log.info(`🚀 Server running on http://localhost:${config.server.port}`)
    app.log.info(`📁 Storage: ${config.storage.type} (${config.storage.localPath})`)
    app.log.info(`🌐 CORS: ${config.cors.origin}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Only auto-start when not under test
if (process.env.NODE_ENV !== 'test') {
  main()
}
