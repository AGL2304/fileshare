import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

export function formatBytes(bytes: number | string): string {
  const n = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  if (n === 0) return '0 o'
  const k = 1024
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To']
  const i = Math.floor(Math.log(n) / Math.log(k))
  return `${parseFloat((n / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr })
}

export function fromNow(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
}

export function getMimeIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return '🗜️'
  return '📁'
}

export function getMimeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image'
  if (mimeType.startsWith('video/')) return 'Vidéo'
  if (mimeType.startsWith('audio/')) return 'Audio'
  if (mimeType === 'application/pdf') return 'PDF'
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'Tableur'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Document'
  if (mimeType.includes('zip') || mimeType.includes('tar')) return 'Archive'
  if (mimeType.startsWith('text/')) return 'Texte'
  return 'Fichier'
}

export function quotaPercent(used: string, total: string): number {
  const u = parseInt(used, 10)
  const t = parseInt(total, 10)
  if (t === 0) return 0
  return Math.min(100, Math.round((u / t) * 100))
}
