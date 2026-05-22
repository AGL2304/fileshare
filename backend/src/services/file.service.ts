import { prisma } from '../config/prisma'
import { storageService } from './storage.service'
import { MultipartFile } from '@fastify/multipart'
import { FileStatus, Prisma } from '@prisma/client'
import { z } from 'zod'
import { Errors } from '../utils/errors'
import { sanitizeFilename } from '../utils/filename'

// ─── Schemas ──────────────────────────────────────────────────────────

export const FileListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  folderId: z.string().uuid().optional(),
  mimeType: z.string().optional(),
  search: z.string().optional(),
})

export type FileListQuery = z.infer<typeof FileListQuerySchema>

// ─── MIME validation ──────────────────────────────────────────────────
//
// All file types are accepted. Only a small denylist of executable container
// types is rejected to reduce trivial abuse (Windows .exe, server-side
// scripts that nginx would otherwise serve). This is NOT a security control —
// any user-supplied content is treated as untrusted and served with the
// Content-Disposition: attachment header to prevent inline rendering.

const DENYLIST_MIMES = new Set<string>([
  // Empty by default — allow all.
])

export function isMimeAllowed(mime: string): boolean {
  // Accept any non-empty MIME type that is not explicitly denied.
  if (!mime || typeof mime !== 'string') return false
  return !DENYLIST_MIMES.has(mime.toLowerCase())
}

// ─── Quota helpers (atomic) ───────────────────────────────────────────

async function atomicQuotaIncrement(userId: string, delta: number): Promise<boolean> {
  const updated = await prisma.$executeRaw<number>`
    UPDATE "users"
    SET "used_bytes" = "used_bytes" + ${delta}
    WHERE "id" = ${userId}::uuid
      AND ("used_bytes" + ${delta}) <= "quota_bytes"
  `
  return updated === 1
}

async function decrementUsedBytes(userId: string, delta: number): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { usedBytes: { decrement: delta } },
  })
}

// ─── File operations ──────────────────────────────────────────────────

export async function uploadFile(
  file: MultipartFile,
  userId: string,
  folderId?: string
) {
  if (!isMimeAllowed(file.mimetype)) {
    throw Errors.mimeNotAllowed(file.mimetype || 'unknown')
  }

  // Stream upload to disk first (size known only at the end)
  const uploadResult = await storageService.upload(file, 'files')

  // Atomic quota check
  const ok = await atomicQuotaIncrement(userId, uploadResult.sizeBytes)
  if (!ok) {
    await storageService.delete(uploadResult.storageKey).catch(() => {})
    throw Errors.quotaExceeded()
  }

  const safeName = sanitizeFilename(file.filename)

  try {
    return await prisma.file.create({
      data: {
        name: safeName,
        originalName: safeName,
        mimeType: uploadResult.mimeType || 'application/octet-stream',
        sizeBytes: uploadResult.sizeBytes,
        storageKey: uploadResult.storageKey,
        status: 'READY',
        userId,
        folderId: folderId ?? null,
      },
    })
  } catch (err) {
    await decrementUsedBytes(userId, uploadResult.sizeBytes).catch(() => {})
    await storageService.delete(uploadResult.storageKey).catch(() => {})
    throw err
  }
}

export async function listFiles(userId: string, query: FileListQuery) {
  const { page, limit, folderId, mimeType, search } = query
  const skip = (page - 1) * limit

  const where: Prisma.FileWhereInput = {
    userId,
    status: { not: FileStatus.DELETED },
    ...(folderId !== undefined ? { folderId } : {}),
    ...(mimeType ? { mimeType: { startsWith: mimeType } } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
  }

  const [files, total] = await prisma.$transaction([
    prisma.file.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        thumbnailKey: true,
        folderId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.file.count({ where }),
  ])

  return {
    data: files.map((f) => ({ ...f, sizeBytes: f.sizeBytes.toString() })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getFileById(fileId: string, userId: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId, status: { not: FileStatus.DELETED } },
  })

  if (!file) throw Errors.fileNotFound()
  return { ...file, sizeBytes: file.sizeBytes.toString() }
}

export async function deleteFile(fileId: string, userId: string) {
  const file = await prisma.file.findFirst({
    where: { id: fileId, userId, status: { not: FileStatus.DELETED } },
  })

  if (!file) throw Errors.fileNotFound()

  await prisma.$transaction([
    prisma.file.update({
      where: { id: fileId },
      data: { status: FileStatus.DELETED },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { usedBytes: { decrement: file.sizeBytes } },
    }),
  ])

  return true
}

export async function getDownloadStream(fileId: string, userId?: string) {
  const where = userId
    ? { id: fileId, userId, status: FileStatus.READY }
    : { id: fileId, status: FileStatus.READY }

  const file = await prisma.file.findFirst({ where })
  if (!file) throw Errors.fileNotFound()

  const stream = await storageService.getStream(file.storageKey)
  return { stream, file }
}
