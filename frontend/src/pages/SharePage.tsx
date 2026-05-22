import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { Lock, Download, Copy, Check, AlertCircle, Eye, Clock, Hash, Loader2 } from 'lucide-react'
import { sharesApi } from '../api'
import { formatBytes, getMimeIcon } from '../utils/format'
import { toast } from 'sonner'

interface ShareInfo {
  id: string
  permission: 'VIEW' | 'DOWNLOAD'
  expiresAt: string | null
  downloadCount: number
  maxDownloads: number | null
  hasPassword: boolean
  file: { name: string; mimeType: string; sizeBytes: string }
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [password, setPassword] = useState('')
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>()
  const [copied, setCopied] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['share', token, submittedPassword ?? ''],
    queryFn: async () => {
      const res = submittedPassword !== undefined
        ? await sharesApi.resolve(token!, submittedPassword)
        : await sharesApi.info(token!)
      return res.data.data as ShareInfo
    },
    enabled: !!token,
    retry: false,
  })

  const axErr = error as AxiosError<{ code?: string; message?: string }> | null
  const errCode = axErr?.response?.data?.code
  const errMessage = axErr?.response?.data?.message ?? ''

  const needsPassword = errCode === 'PASSWORD_REQUIRED' || errCode === 'WRONG_PASSWORD'

  useEffect(() => {
    if (needsPassword) passwordInputRef.current?.focus()
  }, [needsPassword])

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedPassword(password)
  }

  const handleDownload = async () => {
    if (!token || !data) return
    setDownloading(true)
    try {
      await sharesApi.download(token, data.file.name, submittedPassword)
      setDownloaded(true)
      toast.success('Téléchargement démarré')
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      // Blob responses don't auto-parse; if error is a blob, read it
      let message = ax.response?.data?.message
      if (ax.response?.data instanceof Blob) {
        try {
          const text = await (ax.response.data as Blob).text()
          message = JSON.parse(text)?.message ?? message
        } catch { /* keep default */ }
      }
      toast.error(message ?? 'Échec du téléchargement')
    } finally {
      setDownloading(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast.success('Lien copié')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-gray-800 dark:text-gray-100">FileShare</span>
          </div>
        </div>

        <div className="card p-8">
          {isLoading && (
            <div className="text-center py-8" role="status" aria-live="polite">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Chargement...</p>
            </div>
          )}

          {!isLoading && needsPassword && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 bg-yellow-100 dark:bg-yellow-900/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-7 h-7 text-yellow-600" aria-hidden="true" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lien protégé</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Ce fichier est protégé par un mot de passe
                </p>
              </div>
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <label htmlFor="share-password" className="sr-only">Mot de passe</label>
                <input
                  ref={passwordInputRef}
                  id="share-password"
                  className="input"
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                {errCode === 'WRONG_PASSWORD' && (
                  <p className="text-red-500 text-sm" role="alert">Mot de passe incorrect</p>
                )}
                <button type="submit" className="btn-primary w-full justify-center">
                  Accéder au fichier
                </button>
              </form>
            </div>
          )}

          {!isLoading && !needsPassword && !data && error && (
            <div className="text-center py-6 space-y-3" role="alert">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/40 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7 text-red-500" aria-hidden="true" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Lien indisponible</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {errMessage || "Ce lien n'existe pas ou a expiré."}
              </p>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-5xl mb-3" aria-hidden="true">{getMimeIcon(data.file.mimeType)}</div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-lg break-all">
                  {data.file.name}
                </h2>
                <p className="text-sm text-gray-400 mt-1">{formatBytes(data.file.sizeBytes)}</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {data.expiresAt && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 text-xs rounded-full border border-orange-200 dark:border-orange-800">
                    <Clock className="w-3 h-3" aria-hidden="true" />
                    Expire le {new Date(data.expiresAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {data.maxDownloads && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-200 dark:border-blue-800">
                    <Hash className="w-3 h-3" aria-hidden="true" />
                    {data.downloadCount} / {data.maxDownloads}
                  </span>
                )}
                {data.permission === 'VIEW' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-xs rounded-full border border-gray-200 dark:border-slate-700">
                    <Eye className="w-3 h-3" aria-hidden="true" />
                    Lecture seule
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {data.permission === 'DOWNLOAD' && (
                  <button
                    onClick={handleDownload}
                    disabled={downloading}
                    className="btn-primary w-full justify-center py-3"
                    aria-label="Télécharger le fichier"
                    type="button"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        Téléchargement…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" aria-hidden="true" />
                        {downloaded ? 'Téléchargé' : 'Télécharger'}
                      </>
                    )}
                  </button>
                )}
                <button onClick={handleCopyLink} className="btn-secondary w-full justify-center">
                  {copied ? <><Check className="w-4 h-4" aria-hidden="true" /> Lien copié</> :
                    <><Copy className="w-4 h-4" aria-hidden="true" /> Copier le lien</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Partagé via <span className="font-medium">FileShare</span>
        </p>
      </div>
    </div>
  )
}
