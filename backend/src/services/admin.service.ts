import { prisma } from '../config/prisma'
import { storageService } from './storage.service'
import { FileStatus, Role } from '@prisma/client'
import { Errors } from '../utils/errors'
import { z } from 'zod'

// ─── Schemas ──────────────────────────────────────────────────────────

export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.coerce.boolean().optional(),
})
export type UserListQuery = z.infer<typeof UserListQuerySchema>

export const UpdateUserSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  quotaBytes: z.union([z.number(), z.string()]).optional(),
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(100).nullable().optional(),
})
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>

export const FileAdminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.nativeEnum(FileStatus).optional(),
  userId: z.string().uuid().optional(),
})
export type FileAdminListQuery = z.infer<typeof FileAdminListQuerySchema>

export const AccessLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  fileId: z.string().uuid().optional(),
  shareId: z.string().uuid().optional(),
  since: z.string().datetime().optional(),
})
export type AccessLogQuery = z.infer<typeof AccessLogQuerySchema>

// ─── Stats ────────────────────────────────────────────────────────────

export async function getGlobalStats() {
  const [
    userCount,
    activeUserCount,
    fileCount,
    activeFileCount,
    deletedFileCount,
    shareCount,
    activeShareCount,
    accessLogCount,
    storageAgg,
    quotaAgg,
    recentUsers,
    recentFiles,
    recentLogs,
  ] = await prisma.$transaction([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.file.count(),
    prisma.file.count({ where: { status: { not: FileStatus.DELETED } } }),
    prisma.file.count({ where: { status: FileStatus.DELETED } }),
    prisma.share.count(),
    prisma.share.count({ where: { isActive: true } }),
    prisma.accessLog.count(),
    prisma.file.aggregate({
      _sum: { sizeBytes: true },
      where: { status: { not: FileStatus.DELETED } },
    }),
    prisma.user.aggregate({ _sum: { usedBytes: true, quotaBytes: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    prisma.file.findMany({
      where: { status: { not: FileStatus.DELETED } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
        user: { select: { email: true } },
      },
    }),
    prisma.accessLog.findMany({
      orderBy: { accessedAt: 'desc' },
      take: 5,
      include: { file: { select: { name: true } } },
    }),
  ])

  return {
    users: {
      total: userCount,
      active: activeUserCount,
      suspended: userCount - activeUserCount,
    },
    files: {
      total: fileCount,
      active: activeFileCount,
      deleted: deletedFileCount,
      totalBytes: (storageAgg._sum.sizeBytes ?? BigInt(0)).toString(),
    },
    shares: {
      total: shareCount,
      active: activeShareCount,
      revoked: shareCount - activeShareCount,
    },
    storage: {
      usedBytes: (quotaAgg._sum.usedBytes ?? BigInt(0)).toString(),
      quotaBytes: (quotaAgg._sum.quotaBytes ?? BigInt(0)).toString(),
    },
    accessLogs: { total: accessLogCount },
    recentUsers,
    recentFiles: recentFiles.map((f) => ({
      ...f,
      sizeBytes: f.sizeBytes.toString(),
      ownerEmail: f.user.email,
      user: undefined,
    })),
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      action: l.action,
      ipAddress: l.ipAddress,
      userAgent: l.userAgent,
      accessedAt: l.accessedAt,
      fileName: l.file.name,
      fileId: l.fileId,
    })),
  }
}

// ─── Users management ─────────────────────────────────────────────────

export async function listUsers(query: UserListQuery) {
  const { page, limit, search, role, isActive } = query
  const skip = (page - 1) * limit

  const where = {
    ...(role ? { role } : {}),
    ...(typeof isActive === 'boolean' ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { name: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        quotaBytes: true,
        usedBytes: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { files: true, shares: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return {
    data: users.map((u) => ({
      ...u,
      quotaBytes: u.quotaBytes.toString(),
      usedBytes: u.usedBytes.toString(),
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      quotaBytes: true,
      usedBytes: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { files: true, shares: true, refreshTokens: true } },
    },
  })

  if (!user) throw Errors.fileNotFound() // generic 404
  return {
    ...user,
    quotaBytes: user.quotaBytes.toString(),
    usedBytes: user.usedBytes.toString(),
  }
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const data: Record<string, unknown> = {}
  if (input.role !== undefined) data.role = input.role
  if (input.isActive !== undefined) data.isActive = input.isActive
  if (input.name !== undefined) data.name = input.name
  if (input.quotaBytes !== undefined) {
    try {
      data.quotaBytes = BigInt(input.quotaBytes)
    } catch {
      throw new Error('INVALID_QUOTA')
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      quotaBytes: true,
      usedBytes: true,
      isActive: true,
      updatedAt: true,
    },
  })

  // If user got suspended, revoke all refresh tokens
  if (input.isActive === false) {
    await prisma.refreshToken.deleteMany({ where: { userId } }).catch(() => {})
  }

  return {
    ...updated,
    quotaBytes: updated.quotaBytes.toString(),
    usedBytes: updated.usedBytes.toString(),
  }
}

export async function deleteUser(userId: string) {
  // Hard delete: cascade removes files, shares, refresh tokens.
  // Storage blobs are orphaned; cleanup is left to a separate purge job.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { files: { select: { storageKey: true, status: true } } },
  })
  if (!user) throw Errors.fileNotFound()

  await prisma.user.delete({ where: { id: userId } })

  // Best-effort storage cleanup
  for (const f of user.files) {
    if (f.status !== FileStatus.DELETED) {
      await storageService.delete(f.storageKey).catch(() => {})
    }
  }

  return { ok: true, email: user.email }
}

// ─── Files management (admin) ─────────────────────────────────────────

export async function listAllFiles(query: FileAdminListQuery) {
  const { page, limit, search, status, userId } = query
  const skip = (page - 1) * limit

  const where = {
    ...(status ? { status } : {}),
    ...(userId ? { userId } : {}),
    ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
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
        mimeType: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        storageKey: true,
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.file.count({ where }),
  ])

  return {
    data: files.map((f) => ({
      ...f,
      sizeBytes: f.sizeBytes.toString(),
      ownerEmail: f.user.email,
      ownerId: f.user.id,
      ownerName: f.user.name,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function purgeFile(fileId: string) {
  // Hard delete: removes the DB row + blob, regardless of who owns it.
  const file = await prisma.file.findUnique({ where: { id: fileId } })
  if (!file) throw Errors.fileNotFound()

  await prisma.file.delete({ where: { id: fileId } })
  // Decrement quota only if file was still counted (not already soft-deleted)
  if (file.status !== FileStatus.DELETED) {
    await prisma.user
      .update({
        where: { id: file.userId },
        data: { usedBytes: { decrement: file.sizeBytes } },
      })
      .catch(() => {})
  }
  await storageService.delete(file.storageKey).catch(() => {})
  return true
}

// ─── Shares management (admin) ────────────────────────────────────────

export async function listAllShares(query: { page: number; limit: number; activeOnly?: boolean }) {
  const { page, limit, activeOnly } = query
  const skip = (page - 1) * limit

  const where = activeOnly ? { isActive: true } : {}

  const [shares, total] = await prisma.$transaction([
    prisma.share.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        file: { select: { id: true, name: true, mimeType: true, sizeBytes: true } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.share.count({ where }),
  ])

  return {
    data: shares.map((s) => ({
      ...s,
      hasPassword: !!s.passwordHash,
      passwordHash: undefined,
      file: { ...s.file, sizeBytes: s.file.sizeBytes.toString() },
      owner: s.createdBy,
      createdBy: undefined,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function revokeShareAdmin(shareId: string) {
  const share = await prisma.share.findUnique({ where: { id: shareId } })
  if (!share) throw Errors.shareNotFound()
  await prisma.share.update({ where: { id: shareId }, data: { isActive: false } })
  return true
}

// ─── Access logs ──────────────────────────────────────────────────────

export async function listAccessLogs(query: AccessLogQuery) {
  const { page, limit, fileId, shareId, since } = query
  const skip = (page - 1) * limit

  const where = {
    ...(fileId ? { fileId } : {}),
    ...(shareId ? { shareId } : {}),
    ...(since ? { accessedAt: { gte: new Date(since) } } : {}),
  }

  const [logs, total] = await prisma.$transaction([
    prisma.accessLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { accessedAt: 'desc' },
      include: {
        file: { select: { id: true, name: true } },
        share: { select: { id: true, token: true } },
      },
    }),
    prisma.accessLog.count({ where }),
  ])

  return {
    data: logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

// ─── System health (extended) ─────────────────────────────────────────

export async function getSystemInfo() {
  const dbStart = Date.now()
  let dbOk = false
  let dbVersion = 'unknown'
  try {
    const res: Array<{ version: string }> = await prisma.$queryRaw`SELECT version()`
    dbVersion = res[0]?.version ?? 'unknown'
    dbOk = true
  } catch { /* ignore */ }
  const dbLatencyMs = Date.now() - dbStart

  return {
    server: {
      uptime: process.uptime(),
      nodeVersion: process.version,
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
      },
      platform: process.platform,
      arch: process.arch,
    },
    database: {
      ok: dbOk,
      latencyMs: dbLatencyMs,
      version: dbVersion.split(' ')[1] ?? dbVersion,
    },
    env: process.env.NODE_ENV ?? 'unknown',
    now: new Date().toISOString(),
  }
}
