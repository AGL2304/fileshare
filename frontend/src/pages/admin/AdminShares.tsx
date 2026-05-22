import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Share2, ChevronLeft, ChevronRight, Trash2, Copy, Lock, Eye, Download,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '../../api'
import { formatBytes, formatDate } from '../../utils/format'
import { confirm } from '../../components/ui/ConfirmDialog'

interface AdminShare {
  id: string
  token: string
  permission: 'VIEW' | 'DOWNLOAD'
  isActive: boolean
  hasPassword: boolean
  expiresAt: string | null
  maxDownloads: number | null
  downloadCount: number
  createdAt: string
  file: { id: string; name: string; mimeType: string; sizeBytes: string }
  owner: { id: string; email: string; name: string | null }
}

export default function AdminShares() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [activeOnly, setActiveOnly] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'shares', { page, activeOnly }],
    queryFn: () => adminApi.shares.list({ page, limit: 20, activeOnly: activeOnly || undefined }),
  })

  const shares: AdminShare[] = data?.data?.data ?? []
  const total: number = data?.data?.total ?? 0
  const totalPages: number = data?.data?.totalPages ?? 1

  const revokeMutation = useMutation({
    mutationFn: (id: string) => adminApi.shares.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shares'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Lien révoqué')
    },
    onError: () => toast.error('Échec de la révocation'),
  })

  const handleRevoke = async (share: AdminShare) => {
    const ok = await confirm({
      title: 'Révoquer ce lien ?',
      message: `Le lien vers "${share.file.name}" (créé par ${share.owner.email}) ne sera plus accessible.`,
      confirmLabel: 'Révoquer',
      variant: 'danger',
    })
    if (ok) revokeMutation.mutate(share.id)
  }

  const copyShareUrl = async (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Lien copié')
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-blue-600" aria-hidden="true" />
            Partages
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} lien{total > 1 ? 's' : ''}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => { setActiveOnly(e.target.checked); setPage(1) }}
            className="rounded"
          />
          Actifs uniquement
        </label>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : shares.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun partage</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Fichier</th>
                  <th className="px-4 py-3">Créé par</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Téléchargements</th>
                  <th className="px-4 py-3">Expire</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shares.map((s) => {
                  const isExpired = s.expiresAt && new Date(s.expiresAt) < new Date()
                  return (
                    <tr key={s.id} className={`border-t border-gray-100 dark:border-slate-700/60 ${!s.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{s.file.name}</p>
                        <p className="text-xs text-gray-400">{formatBytes(s.file.sizeBytes)}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                        {s.owner.name ?? s.owner.email}
                        <div className="text-gray-400">{s.owner.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className={`badge ${
                            s.permission === 'DOWNLOAD'
                              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {s.permission === 'DOWNLOAD' ? <Download className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            {s.permission}
                          </span>
                          {s.hasPassword && (
                            <span className="badge bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                              <Lock className="w-3 h-3" /> mdp
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums text-xs">
                        {s.downloadCount}
                        {s.maxDownloads ? ` / ${s.maxDownloads}` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {s.expiresAt ? formatDate(s.expiresAt) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {!s.isActive ? (
                          <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-500">Révoqué</span>
                        ) : isExpired ? (
                          <span className="badge bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">Expiré</span>
                        ) : (
                          <span className="badge bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">Actif</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {s.isActive && (
                            <>
                              <button
                                onClick={() => copyShareUrl(s.token)}
                                className="btn-ghost p-1.5 rounded-md"
                                aria-label="Copier le lien"
                                type="button"
                                title="Copier"
                              >
                                <Copy className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => handleRevoke(s)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                                aria-label="Révoquer"
                                type="button"
                                title="Révoquer"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-2" aria-label="Pagination">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-sm" type="button">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Précédent
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">Page {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary px-3 py-1.5 text-sm" type="button">
            Suivant <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}
