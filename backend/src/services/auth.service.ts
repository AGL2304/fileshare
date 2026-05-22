import bcrypt from 'bcryptjs'
import { prisma } from '../config/prisma'
import { config } from '../config'
import { z } from 'zod'
import { FastifyInstance } from 'fastify'
import { generateOpaqueToken, sha256 } from '../utils/crypto'
import { Errors } from '../utils/errors'

// ─── Schemas ──────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z
    .string()
    .min(8, 'Mot de passe trop court (8 caractères minimum)')
    .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Doit contenir au moins un chiffre'),
  name: z.string().min(2).max(100).optional(),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>

// ─── Helpers ──────────────────────────────────────────────────────────

const SALT_ROUNDS = 12
const REFRESH_TTL_DAYS = 7

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ─── Token generation ─────────────────────────────────────────────────

export function generateTokens(
  fastify: FastifyInstance,
  payload: { sub: string; email: string; role: string }
) {
  const accessToken = fastify.jwt.sign(payload, {
    expiresIn: config.jwt.expiresIn,
  })

  const refreshToken = generateOpaqueToken()
  return { accessToken, refreshToken }
}

// ─── Auth operations ──────────────────────────────────────────────────

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (existing) throw Errors.emailTaken()

  const passwordHash = await hashPassword(input.password)

  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      quotaBytes: true,
      usedBytes: true,
      createdAt: true,
    },
  })
}

export async function loginUser(input: LoginInput, fastify: FastifyInstance) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (!user || !user.isActive) throw Errors.invalidCredentials()

  const valid = await verifyPassword(input.password, user.passwordHash)
  if (!valid) throw Errors.invalidCredentials()

  const { accessToken, refreshToken } = generateTokens(fastify, {
    sub: user.id,
    email: user.email,
    role: user.role,
  })

  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 3600 * 1000)

  await prisma.refreshToken.create({
    data: {
      token: sha256(refreshToken),
      userId: user.id,
      expiresAt,
    },
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      quotaBytes: user.quotaBytes.toString(),
      usedBytes: user.usedBytes.toString(),
    },
  }
}

export async function refreshTokens(token: string, fastify: FastifyInstance) {
  const hash = sha256(token)
  const stored = await prisma.refreshToken.findUnique({
    where: { token: hash },
    include: { user: true },
  })

  if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
    throw Errors.invalidRefreshToken()
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(fastify, {
    sub: stored.user.id,
    email: stored.user.email,
    role: stored.user.role,
  })

  await prisma.$transaction([
    prisma.refreshToken.delete({ where: { id: stored.id } }),
    prisma.refreshToken.create({
      data: {
        token: sha256(newRefreshToken),
        userId: stored.user.id,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 3600 * 1000),
      },
    }),
  ])

  return { accessToken, refreshToken: newRefreshToken }
}

export async function logoutUser(refreshToken: string) {
  await prisma.refreshToken
    .delete({ where: { token: sha256(refreshToken) } })
    .catch(() => {})
}
