import { describe, it, expect } from 'vitest'
import {
  UserListQuerySchema,
  UpdateUserSchema,
  FileAdminListQuerySchema,
  AccessLogQuerySchema,
} from '../src/services/admin.service'

describe('UserListQuerySchema', () => {
  it('defaults page=1, limit=20', () => {
    const r = UserListQuerySchema.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.page).toBe(1)
      expect(r.data.limit).toBe(20)
    }
  })

  it('accepts role filter', () => {
    expect(UserListQuerySchema.safeParse({ role: 'ADMIN' }).success).toBe(true)
    expect(UserListQuerySchema.safeParse({ role: 'INVALID' }).success).toBe(false)
  })

  it('coerces isActive from string', () => {
    const r = UserListQuerySchema.safeParse({ isActive: 'true' })
    expect(r.success).toBe(true)
  })
})

describe('UpdateUserSchema', () => {
  it('accepts partial updates', () => {
    expect(UpdateUserSchema.safeParse({ role: 'PREMIUM' }).success).toBe(true)
    expect(UpdateUserSchema.safeParse({ isActive: false }).success).toBe(true)
    expect(UpdateUserSchema.safeParse({ quotaBytes: '10000000000' }).success).toBe(true)
    expect(UpdateUserSchema.safeParse({ name: 'New Name' }).success).toBe(true)
    expect(UpdateUserSchema.safeParse({ name: null }).success).toBe(true)
  })

  it('rejects invalid role', () => {
    expect(UpdateUserSchema.safeParse({ role: 'KING' }).success).toBe(false)
  })
})

describe('FileAdminListQuerySchema', () => {
  it('accepts status filter', () => {
    expect(FileAdminListQuerySchema.safeParse({ status: 'READY' }).success).toBe(true)
    expect(FileAdminListQuerySchema.safeParse({ status: 'NOPE' }).success).toBe(false)
  })

  it('accepts uuid userId', () => {
    expect(
      FileAdminListQuerySchema.safeParse({ userId: '00000000-0000-0000-0000-000000000001' }).success
    ).toBe(true)
    expect(FileAdminListQuerySchema.safeParse({ userId: 'nope' }).success).toBe(false)
  })
})

describe('AccessLogQuerySchema', () => {
  it('accepts since ISO datetime', () => {
    expect(
      AccessLogQuerySchema.safeParse({ since: '2026-01-01T00:00:00.000Z' }).success
    ).toBe(true)
  })

  it('rejects non-ISO since', () => {
    expect(AccessLogQuerySchema.safeParse({ since: '01/01/2026' }).success).toBe(false)
  })
})
