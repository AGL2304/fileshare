import { describe, it, expect } from 'vitest'
import {
  UpdateEmailSchema,
  ChangePasswordSchema,
  UpdateNameSchema,
} from '../src/services/profile.service'

describe('UpdateEmailSchema', () => {
  it('accepts a valid email + password', () => {
    const r = UpdateEmailSchema.safeParse({
      newEmail: 'new@example.com',
      currentPassword: 'whatever',
    })
    expect(r.success).toBe(true)
  })

  it('rejects bad email', () => {
    expect(UpdateEmailSchema.safeParse({
      newEmail: 'not-an-email',
      currentPassword: 'pwd',
    }).success).toBe(false)
  })

  it('rejects empty password', () => {
    expect(UpdateEmailSchema.safeParse({
      newEmail: 'a@b.com',
      currentPassword: '',
    }).success).toBe(false)
  })
})

describe('ChangePasswordSchema', () => {
  it('accepts strong new password', () => {
    const r = ChangePasswordSchema.safeParse({
      currentPassword: 'oldpass',
      newPassword: 'NewPass1234',
    })
    expect(r.success).toBe(true)
  })

  it('rejects weak (no uppercase)', () => {
    expect(ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'lowercase123',
    }).success).toBe(false)
  })

  it('rejects weak (no digit)', () => {
    expect(ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'OnlyLetters',
    }).success).toBe(false)
  })

  it('rejects when new = current', () => {
    expect(ChangePasswordSchema.safeParse({
      currentPassword: 'Same1234',
      newPassword: 'Same1234',
    }).success).toBe(false)
  })

  it('rejects new < 8 chars', () => {
    expect(ChangePasswordSchema.safeParse({
      currentPassword: 'old',
      newPassword: 'Ab1',
    }).success).toBe(false)
  })
})

describe('UpdateNameSchema', () => {
  it('accepts non-empty name', () => {
    expect(UpdateNameSchema.safeParse({ name: 'Jean' }).success).toBe(true)
  })

  it('accepts null (clear name)', () => {
    expect(UpdateNameSchema.safeParse({ name: null }).success).toBe(true)
  })

  it('rejects empty string', () => {
    expect(UpdateNameSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('rejects > 100 chars', () => {
    expect(UpdateNameSchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })
})
