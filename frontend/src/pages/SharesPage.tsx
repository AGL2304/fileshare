import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Copy, Trash2, Link as LinkIcon, Lock, Eye, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { sharesApi } from '../api'
import { formatBytes, formatDate, getMimeIcon } from '../utils/format'
import { confirm } from '../components/ui/ConfirmDialog'

interface ShareItem {
  id: string
  token: string
  permission: 'VIEW' | 'DOWNLOAD'
  isActive: boolean
  hasPassword: boolean
  expiresAt: string | null
  maxDownloads: number | null
  downloadCount: number
  createdAt: string
  shareUrl: string
  file: {
    id: string
    name: string
    mimeType: string
    sizeBytes: string
  }
}

export default function SharesPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['shares'],
    queryFn: () => sharesApi.list(),
  })

  const revokeMutation = useMutation({
    mutationFn: sharesApi.revoke,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shares'] })
      toast.success('Lien révoqué')
    },
    onError: () => toast.error('Échec de la révocation'),
  })

  const shares: ShareItem[] = data?.data?.data ?? []
  const active = shares.filter((s) => s.isActive)
  const inactive = shares.filter((s) => !s.isActive)

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié')
    } catch {
      toast.error('Impossible de copier')
    }
  }

  const handleRevoke = async (share: ShareItem) => {
    const ok = await confirm({
      title: 'Révoquer ce lien ?',
      message: `Le lien vers "${share.file.name}" ne sera plus accessible.`,
      confirmLabel: 'Révoquer',
      variant: 'danger',
    })
    if (ok) revokeMutation.mutate(share.id)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary px-3 py-2"
            type="button"
            aria-label="Retour au tableau de bord"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Retour
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mes partages</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {active.length} lien{active.length !== 1 ? 's' : ''} actif{active.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3" aria-busy="true" aria-label="Chargement">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-slate-700/60 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && shares.length === 0 && (
          <div className="card p-12 text-center">
            <LinkIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-slate-600" aria-hidden="true" />
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mb-1">Aucun partage</h2>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Créez des liens de partage depuis vos fichiers
            </p>
            <button
              onClick={() => navigate('/')}
              className="btn-primary mt-4 mx-auto"
              type="button"
            >
              Mes fichiers
            </button>
          </div>
        )}

        {active.length > 0 && (
          <section className="space-y-3" aria-labelledby="active-shares-heading">
            <h2 id="active-shares-heading" className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actifs ({active.length})
            </h2>
            {active.map((share) => (
              <ShareCard
                key={share.id}
                share={share}
                onCopy={() => copyLink(share.shareUrl)}
                onRevoke={() => handleRevoke(share)}
                isRevoking={revokeMutation.isPending && revokeMutation.variables === share.id}
              />
            ))}
          </section>
        )}

        {inactive.length > 0 && (
          <section className="space-y-3" aria-labelledby="inactive-shares-heading">
            <h2 id="inactive-shares-heading" className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Révoqués ({inactive.length})
            </h2>
            {inactive.map((share) => (
              <ShareCard key={share.id} share={share} revoked />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}

function ShareCard({
  share, onCopy, onRevoke, isRevoking, revoked,
}: {
  share: ShareItem
  onCopy?: () => void
  onRevoke?: () => void
  isRevoking?: boolean
  revoked?: boolean
}) {
  const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date()
  const limitReached =
    share.maxDownloads != null && share.downloadCount >= share.maxDownloads

  return (
    <div className={`card p-4 ${revoked ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">
          {getMimeIcon(share.file.mimeType)}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
              {share.file.name}
            </p>
            {revoked && (
              <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400">Révoqué</span>
            )}
            {!revoked && isExpired && (
              <span className="badge bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300">Expiré</span>
            )}
            {!revoked && limitReached && (
              <span className="badge bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300">
                Limite atteinte
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span>{formatBytes(share.file.sizeBytes)}</span>
            <span>Créé le {formatDate(share.createdAt)}</span>
            {share.expiresAt && <span>Expire le {formatDate(share.expiresAt)}</span>}
            {share.maxDownloads != null ? (
              <span>{share.downloadCount}/{share.maxDownloads} téléchargements</span>
            ) : (
              <span>{share.downloadCount} téléchargement{share.downloadCount !== 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className={`badge ${
              share.permission === 'DOWNLOAD'
                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
            }`}>
              {share.permission === 'DOWNLOAD' ? (
                <><Download className="w-3 h-3" aria-hidden="true" /> Téléchargement</>
              ) : (
                <><Eye className="w-3 h-3" aria-hidden="true" /> Lecture seule</>
              )}
            </span>
            {share.hasPassword && (
              <span className="badge bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                <Lock className="w-3 h-3" aria-hidden="true" />
                Protégé
              </span>
            )}
          </div>
        </div>

        {!revoked && (
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              onClick={onCopy}
              className="btn-secondary text-xs px-2.5 py-1.5"
              type="button"
              aria-label={`Copier le lien vers ${share.file.name}`}
            >
              <Copy className="w-3 h-3" aria-hidden="true" />
              Copier
            </button>
            <button
              onClick={onRevoke}
              disabled={isRevoking}
              className="btn-danger text-xs px-2.5 py-1.5"
              type="button"
              aria-label={`Révoquer le lien vers ${share.file.name}`}
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
              {isRevoking ? '…' : 'Révoquer'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
