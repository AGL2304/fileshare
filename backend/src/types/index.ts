import { FastifyRequest } from 'fastify'

export interface JwtPayload {
  sub: string      // user id
  email: string
  role: string
  iat?: number
  exp?: number
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload
}

export interface PaginationQuery {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  errors?: Record<string, string[]>
}

export type StorageProvider = 'local' | 's3'
