import { describe, it, expect } from 'vitest'
import { formatBytes, quotaPercent, getMimeIcon, getMimeCategory } from './format'

describe('formatBytes', () => {
  it('handles zero', () => {
    expect(formatBytes(0)).toBe('0 o')
    expect(formatBytes('0')).toBe('0 o')
  })

  it('formats small sizes in octets', () => {
    expect(formatBytes(512)).toContain('o')
  })

  it('formats KB / MB / GB', () => {
    expect(formatBytes(1024)).toBe('1 Ko')
    expect(formatBytes(1024 * 1024)).toBe('1 Mo')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 Go')
  })

  it('parses string input', () => {
    expect(formatBytes('5242880')).toBe('5 Mo')
  })
})

describe('quotaPercent', () => {
  it('returns 0 when total is 0', () => {
    expect(quotaPercent('100', '0')).toBe(0)
  })

  it('clamps to 100', () => {
    expect(quotaPercent('999', '100')).toBe(100)
  })

  it('rounds the value', () => {
    expect(quotaPercent('50', '100')).toBe(50)
    expect(quotaPercent('33', '100')).toBe(33)
  })
})

describe('getMimeIcon', () => {
  it('returns an emoji for known mimes', () => {
    expect(getMimeIcon('image/png')).toBeTruthy()
    expect(getMimeIcon('application/pdf')).toBeTruthy()
    expect(getMimeIcon('video/mp4')).toBeTruthy()
  })

  it('falls back to a generic icon', () => {
    expect(getMimeIcon('foo/bar')).toBeTruthy()
  })
})

describe('getMimeCategory', () => {
  it('classifies known mimes', () => {
    expect(getMimeCategory('image/png')).toBe('Image')
    expect(getMimeCategory('video/mp4')).toBe('Vidéo')
    expect(getMimeCategory('application/pdf')).toBe('PDF')
  })
})
