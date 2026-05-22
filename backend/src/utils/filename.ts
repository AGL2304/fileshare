const SAFE_FILENAME_RE = /^[A-Za-z0-9._\- ()\[\]éèêëàâäîïôöùûüçÉÈÊËÀÂÄÎÏÔÖÙÛÜÇ]+$/u

export function sanitizeFilename(raw: string): string {
  // 1. Strip null bytes & control characters
  let s = raw.replace(/[\x00-\x1F\x7F]/g, '')
  // 2. Replace path separators with underscore (anti path-traversal)
  s = s.replace(/[\\/]/g, '_')
  // 3. Collapse any sequence of dots to a single underscore (kills .. / ...)
  s = s.replace(/\.{2,}/g, '_')
  // 4. Clamp to 255 chars and trim spaces
  s = s.slice(0, 255).trim()

  return s.length === 0 ? 'unnamed' : s
}

export function isSafeFilename(name: string): boolean {
  return SAFE_FILENAME_RE.test(name)
}

/**
 * Extracts an extension safe to use on disk.
 * - Lowercased, max 16 chars, alphanumeric only.
 * - Falls back to "bin" for anything weird or empty.
 *
 * Note: this only sanitizes the *on-disk* storage key. The user-visible
 * filename is preserved by `sanitizeFilename` and used for downloads.
 */
export function safeExtension(filename: string): string {
  const idx = filename.lastIndexOf('.')
  if (idx === -1 || idx === filename.length - 1) return 'bin'
  const ext = filename.slice(idx + 1).toLowerCase()
  if (!/^[a-z0-9]{1,16}$/.test(ext)) return 'bin'
  return ext
}
