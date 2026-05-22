import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '../src/services/auth.service'

describe('password hashing', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('Hunter1234')
    expect(hash).not.toBe('Hunter1234')
    expect(hash).toMatch(/^\$2[ab]\$/)
    expect(await verifyPassword('Hunter1234', hash)).toBe(true)
    expect(await verifyPassword('wrong-password', hash)).toBe(false)
  })

  it('produces different hashes for the same password (salting)', async () => {
    const a = await hashPassword('Hunter1234')
    const b = await hashPassword('Hunter1234')
    expect(a).not.toBe(b)
    expect(await verifyPassword('Hunter1234', a)).toBe(true)
    expect(await verifyPassword('Hunter1234', b)).toBe(true)
  })
})
