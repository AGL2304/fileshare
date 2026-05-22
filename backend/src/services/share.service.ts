import { prisma } from '../config/prisma'
import { storageService } from './storage.service'
import { FileStatus, SharePermission } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { Errors } from '../utils/errors'
import { config } from '../config'

// ─── Schemas ──────────────────────────────────────────────────────────

export const CreateShareSchema = z.object({
  fileId: z.string().uuid(),
  password: z.string().min(4).max(128).optional(),
  permission: z.nativeEnum(SharePermission).default('DOWNLOAD'),
  expiresAt: z.string().datetime().optional(),
  maxDownloads: z.number().int().min(1).max(100_000).optional(),
})

export type CreateShareInput = z.infer<typeof CreateShareSchema>

// ─── Share operations ─────────────────────────────────────────────────

export async function createShare(input: CreateShareInput, userId: string) {
  const file = await prisma.file.findFirst({
    where: { id: input.fileId, userId, status: FileStatus.READY },
  })

  if (!file) throw Errors.fileNotFound()

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, 10)
    : null

  const share = await prisma.share.create({
    data: {
      fileId: input.fileId,
      createdById: userId,
      passwordHash,
      permission: input.permission,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      maxDownloads: input.maxDownloads ?? null,
    },
    select: {
      id: true,
      token: true,
      permission: true,
      expiresAt: true,
      maxDownloads: true,
      downloadCount: true,
      isActive: true,
      createdAt: true,
      file: {
        select: {
          id: true,
          name: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
    },
  })

  return {
    ...share,
    shareUrl: `${config.app.frontendUrl}/share/${share.token}`,
    hasPassword: !!passwordHash,
    file: {
      ...share.file,
      sizeBytes: share.file.sizeBytes.toString(),
    },
  }
}

export async function resolveShare(token: string, password?: string) {
  const share = await prisma.share.findUnique({
    where: { token },
    include: { file: true },
  })

  if (!share || !share.isActive) throw Errors.shareNotFound()
  if (share.file.status !== FileStatus.READY) throw Errors.fileNotReady()

  if (share.expiresAt && share.expiresAt < new Date()) throw Errors.shareExpired()

  if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
    throw Errors.shareLimitReached()
  }

  if (share.passwordHash) {
    if (!password) throw Errors.passwordRequired()
    const valid = await bcrypt.compare(password, share.passwordHash)
    if (!valid) throw Errors.wrongPassword()
  }

  return {
    share,
    file: { ...share.file, sizeBytes: share.file.sizeBytes.toString() },
  }
}

export async function getShareDownloadUrl(
  token: string,
  password?: string,
  ipAddress = 'unknown',
  userAgent?: string
) {
  const { share, file } = await resolveShare(token, password)

  if (share.permission === SharePermission.VIEW) {
    throw Errors.downloadNotPermitted()
  }

  await prisma.$transaction([
    prisma.share.update({
      where: { id: share.id },
      data: { downloadCount: { increment: 1 } },
    }),
    prisma.accessLog.create({
      data: {
        fileId: file.id,
        shareId: share.id,
        ipAddress,
        userAgent,
        action: 'download',
      },
    }),
  ])

  const downloadUrl = await storageService.getDownloadUrl(share.file.storageKey, 900)
  return { downloadUrl, file }
}

export async function listUserShares(userId: string) {
  const shares = await prisma.share.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      file: {
        select: { id: true, name: true, mimeType: true, sizeBytes: true },
      },
    },
  })

  return shares.map((s) => ({
    ...s,
    shareUrl: `${config.app.frontendUrl}/share/${s.token}`,
    hasPassword: !!s.passwordHash,
    passwordHash: undefined,
    file: { ...s.file, sizeBytes: s.file.sizeBytes.toString() },
  }))
}

export async function revokeShare(shareId: string, userId: string) {
  const share = await prisma.share.findFirst({
    where: { id: shareId, createdById: userId },
  })

  if (!share) throw Errors.shareNotFound()

  await prisma.share.update({
    where: { id: shareId },
    data: { isActive: false },
  })

  return true
}
