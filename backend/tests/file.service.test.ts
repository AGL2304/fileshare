import { describe, it, expect } from 'vitest'
import { isMimeAllowed } from '../src/services/file.service'

describe('isMimeAllowed (allow-all policy)', () => {
  it('accepts common images', () => {
    expect(isMimeAllowed('image/png')).toBe(true)
    expect(isMimeAllowed('image/jpeg')).toBe(true)
    expect(isMimeAllowed('image/webp')).toBe(true)
  })

  it('accepts documents', () => {
    expect(isMimeAllowed('application/pdf')).toBe(true)
    expect(isMimeAllowed('text/plain')).toBe(true)
  })

  it('accepts archives and executables (allow-all policy — they are served as attachments)', () => {
    expect(isMimeAllowed('application/x-msdownload')).toBe(true)
    expect(isMimeAllowed('application/zip')).toBe(true)
    expect(isMimeAllowed('application/octet-stream')).toBe(true)
  })

  it('accepts unknown but well-formed mimes', () => {
    expect(isMimeAllowed('foo/bar')).toBe(true)
    expect(isMimeAllowed('application/x-custom')).toBe(true)
  })

  it('rejects empty / invalid input', () => {
    expect(isMimeAllowed('')).toBe(false)
    expect(isMimeAllowed(null as unknown as string)).toBe(false)
    expect(isMimeAllowed(undefined as unknown as string)).toBe(false)
  })
})
