import { describe, it, expect } from 'vitest'
import { sha256, generateOpaqueToken } from '../src/utils/crypto'

describe('crypto utils', () => {
  it('sha256 returns 64-char hex digest', () => {
    const h = sha256('hello')
    expect(h).toHaveLength(64)
    expect(h).toMatch(/^[a-f0-9]+$/)
  })

  it('sha256 is deterministic', () => {
    expect(sha256('foo')).toBe(sha256('foo'))
    expect(sha256('foo')).not.toBe(sha256('bar'))
  })

  it('generateOpaqueToken yields unique base64url tokens', () => {
    const a = generateOpaqueToken()
    const b = generateOpaqueToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})
