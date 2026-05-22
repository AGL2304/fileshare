import { createReadStream, createWriteStream, existsSync } from 'fs'
import { mkdir, unlink, stat } from 'fs/promises'
import { join, resolve, sep } from 'path'
import { pipeline } from 'stream/promises'
import { config } from '../config'
import { randomUUID } from 'crypto'
import { MultipartFile } from '@fastify/multipart'
import { safeExtension } from '../utils/filename'

export interface UploadResult {
  storageKey: string
  sizeBytes: number
  mimeType: string
  detectedMime?: string
}

export interface StorageService {
  upload(file: MultipartFile, prefix?: string): Promise<UploadResult>
  getDownloadUrl(storageKey: string, expiresInSeconds?: number): Promise<string>
  delete(storageKey: string): Promise<void>
  getStream(storageKey: string): Promise<NodeJS.ReadableStream>
}

class LocalStorageService implements StorageService {
  private readonly basePath: string

  constructor(basePath: string) {
    this.basePath = resolve(basePath)
  }

  private async ensureDir(dir: string): Promise<void> {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true })
    }
  }

  private resolveSafe(storageKey: string): string {
    const full = resolve(this.basePath, storageKey)
    if (!full.startsWith(this.basePath + sep) && full !== this.basePath) {
      throw new Error('PATH_TRAVERSAL_DETECTED')
    }
    return full
  }

  async upload(file: MultipartFile, prefix = 'files'): Promise<UploadResult> {
    const ext = safeExtension(file.filename)
    const safePrefix = /^[a-z0-9_-]+$/i.test(prefix) ? prefix : 'files'
    const storageKey = `${safePrefix}/${randomUUID()}.${ext}`
    const fullPath = this.resolveSafe(storageKey)
    const dir = join(this.basePath, safePrefix)

    await this.ensureDir(dir)

    let sizeBytes = 0
    const writeStream = createWriteStream(fullPath)

    file.file.on('data', (chunk: Buffer) => {
      sizeBytes += chunk.length
    })

    await pipeline(file.file, writeStream)

    return {
      storageKey,
      sizeBytes,
      mimeType: file.mimetype,
    }
  }

  async getDownloadUrl(storageKey: string): Promise<string> {
    return `${config.app.url}/api/v1/internal/storage/${storageKey}`
  }

  async delete(storageKey: string): Promise<void> {
    const fullPath = this.resolveSafe(storageKey)
    if (existsSync(fullPath)) {
      await unlink(fullPath)
    }
  }

  async getStream(storageKey: string): Promise<NodeJS.ReadableStream> {
    const fullPath = this.resolveSafe(storageKey)
    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${storageKey}`)
    }
    return createReadStream(fullPath)
  }

  async getSize(storageKey: string): Promise<number> {
    const stats = await stat(this.resolveSafe(storageKey))
    return stats.size
  }
}

function createStorageService(): StorageService {
  if (config.storage.type === 's3') {
    console.warn('[Storage] S3 not yet implemented, falling back to local')
  }
  return new LocalStorageService(config.storage.localPath)
}

export const storageService = createStorageService()
