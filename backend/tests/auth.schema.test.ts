import { describe, it, expect } from 'vitest'
import { RegisterSchema, LoginSchema } from '../src/services/auth.service'

describe('RegisterSchema', () => {
  it('accepts a valid registration', () => {
    const r = RegisterSchema.safeParse({
      email: 'jane@example.com',
      password: 'Strong1234',
      name: 'Jane Doe',
    })
    expect(r.success).toBe(true)
  })

  it('rejects weak passwords (no uppercase)', () => {
    const r = RegisterSchema.safeParse({
      email: 'a@b.com',
      password: 'lowercase123',
    })
    expect(r.success).toBe(false)
  })

  it('rejects weak passwords (no digit)', () => {
    const r = RegisterSchema.safeParse({
      email: 'a@b.com',
      password: 'NoDigitHere',
    })
    expect(r.success).toBe(false)
  })

  it('rejects passwords < 8 chars', () => {
    const r = RegisterSchema.safeParse({
      email: 'a@b.com',
      password: 'Ab1',
    })
    expect(r.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const r = RegisterSchema.safeParse({
      email: 'not-an-email',
      password: 'Strong1234',
    })
    expect(r.success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('accepts email + password', () => {
    expect(
      LoginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success
    ).toBe(true)
  })

  it('rejects empty password', () => {
    expect(
      LoginSchema.safeParse({ email: 'a@b.com', password: '' }).success
    ).toBe(false)
  })
})
