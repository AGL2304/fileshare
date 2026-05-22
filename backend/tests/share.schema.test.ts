import { describe, it, expect } from 'vitest'
import { CreateShareSchema } from '../src/services/share.service'

describe('CreateShareSchema', () => {
  it('accepts minimal valid input', () => {
    const r = CreateShareSchema.safeParse({
      fileId: '00000000-0000-0000-0000-000000000001',
    })
    expect(r.success).toBe(true)
    expect(r.success && r.data.permission).toBe('DOWNLOAD')
  })

  it('rejects short passwords', () => {
    const r = CreateShareSchema.safeParse({
      fileId: '00000000-0000-0000-0000-000000000001',
      password: 'abc',
    })
    expect(r.success).toBe(false)
  })

  it('accepts VIEW permission', () => {
    const r = CreateShareSchema.safeParse({
      fileId: '00000000-0000-0000-0000-000000000001',
      permission: 'VIEW',
    })
    expect(r.success).toBe(true)
  })

  it('rejects non-uuid fileId', () => {
    const r = CreateShareSchema.safeParse({ fileId: 'not-a-uuid' })
    expect(r.success).toBe(false)
  })

  it('rejects negative maxDownloads', () => {
    const r = CreateShareSchema.safeParse({
      fileId: '00000000-0000-0000-0000-000000000001',
      maxDownloads: -1,
    })
    expect(r.success).toBe(false)
  })
})
