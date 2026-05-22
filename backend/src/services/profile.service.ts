import { prisma } from '../config/prisma'
import { storageService } from './storage.service'
import { hashPassword, verifyPassword } from './auth.service'
import { MultipartFile } from '@fastify/multipart'
import { z } from 'zod'
import { Errors } from '../utils/errors'

// ─── Schemas ──────────────────────────────────────────────────────────

export const UpdateEmailSchema = z.object({
  newEmail: z.string().email('Email invalide'),
  currentPassword: z.string().min(1, 'Mot de passe requis'),
})

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z
      .string()
      .min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères')
      .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
      .regex(/[0-9]/, 'Doit contenir au moins un chiffre'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'Le nouveau mot de passe doit différer de l\'actuel',
    path: ['newPassword'],
  })

export const UpdateNameSchema = z.object({
  name: z.string().min(1).max(100).nullable(),
})

export type UpdateEmailInput = z.infer<typeof UpdateEmailSchema>
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
export type UpdateNameInput = z.infer<typeof UpdateNameSchema>

// ─── Constants ────────────────────────────────────────────────────────

const ALLOWED_AVATAR_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_AVATAR_SIZE = 2 * 1024 * 1024 // 2 MB

// ─── Operations ───────────────────────────────────────────────────────

export async function updateEmail(userId: string, input: UpdateEmailInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Errors.userNotFound()

  const valid = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!valid) throw Errors.wrongCurrentPassword()

  if (user.email === input.newEmail) throw Errors.emailUnchanged()

  const existing = await prisma.user.findUnique({ where: { email: input.newEmail } })
  if (existing && existing.id !== userId) throw Errors.emailTaken()

  // Update + invalidate all refresh tokens (force re-login on other devices)
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { email: input.newEmail } }),
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ])

  return { email: input.newEmail }
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Errors.userNotFound()

  const valid = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!valid) throw Errors.wrongCurrentPassword()

  const newHash = await hashPassword(input.newPassword)

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } }),
    // Invalidate all refresh tokens — security best practice on password change
    prisma.refreshToken.deleteMany({ where: { userId } }),
  ])

  return true
}

export async function updateName(userId: string, input: UpdateNameInput) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name },
    select: { id: true, name: true },
  })
  return user
}

export async function uploadAvatar(userId: string, file: MultipartFile) {
  if (!ALLOWED_AVATAR_MIMES.has(file.mimetype)) {
    throw Errors.invalidAvatarType()
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) throw Errors.userNotFound()

  const uploaded = await storageService.upload(file, 'avatars')

  // Enforce size limit post-upload (multipart limit is global)
  if (uploaded.sizeBytes > MAX_AVATAR_SIZE) {
    await storageService.delete(uploaded.storageKey).catch(() => {})
    throw Errors.avatarTooLarge()
  }

  // Best-effort cleanup of previous avatar
  if (user.avatarKey) {
    await storageService.delete(user.avatarKey).catch(() => {})
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { avatarKey: uploaded.storageKey },
    select: { id: true, avatarKey: true },
  })

  return updated
}

export async function deleteAvatar(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarKey: true },
  })
  if (!user) throw Errors.userNotFound()
  if (!user.avatarKey) return true

  await storageService.delete(user.avatarKey).catch(() => {})
  await prisma.user.update({
    where: { id: userId },
    data: { avatarKey: null },
  })
  return true
}

export async function getAvatarStream(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarKey: true },
  })
  if (!user || !user.avatarKey) throw Errors.avatarNotFound()

  const stream = await storageService.getStream(user.avatarKey)
  const mime = mimeFromKey(user.avatarKey)
  return { stream, mime }
}

function mimeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'webp': return 'image/webp'
    default: return 'application/octet-stream'
  }
}
