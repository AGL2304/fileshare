import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Files, Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '../../api'
import { formatBytes, formatDate, getMimeIcon } from '../../utils/format'
import { confirm } from '../../components/ui/ConfirmDialog'

interface AdminFile {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  status: 'PENDING' | 'SCANNING' | 'READY' | 'QUARANTINED' | 'DELETED'
  createdAt: string
  storageKey: string
  ownerEmail: string
  ownerId: string
  ownerName: string | null
}

const STATUS_OPTIONS = ['', 'READY', 'PENDING', 'SCANNING', 'QUARANTINED', 'DELETED'] as const

export default function AdminFiles() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_OPTIONS[number]>('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'files', { page, search, statusFilter }],
    queryFn: () => adminApi.files.list({
      page,
      limit: 30,
      search: search || undefined,
      status: statusFilter || undefined,
    }),
  })

  const files: AdminFile[] = data?.data?.data ?? []
  const total: number = data?.data?.total ?? 0
  const totalPages: number = data?.data?.totalPages ?? 1

  const purgeMutation = useMutation({
    mutationFn: (id: string) => adminApi.files.purge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'files'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Fichier purgé')
    },
    onError: () => toast.error('Échec de la purge'),
  })

  const handlePurge = async (file: AdminFile) => {
    const ok = await confirm({
      title: 'Purger définitivement ce fichier ?',
      message: `"${file.name}" (${formatBytes(file.sizeBytes)}) sera supprimé du disque et de la base. Cette action est irréversible.`,
      confirmLabel: 'Purger',
      variant: 'danger',
    })
    if (ok) purgeMutation.mutate(file.id)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Files className="w-6 h-6 text-green-600" aria-hidden="true" />
          Fichiers
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} fichier{total > 1 ? 's' : ''} au total
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="search"
            className="input pl-9"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            aria-label="Rechercher"
          />
        </div>
        <select
          className="input sm:w-48"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof STATUS_OPTIONS[number]); setPage(1) }}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous statuts</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun fichier</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Fichier</th>
                  <th className="px-4 py-3">Propriétaire</th>
                  <th className="px-4 py-3">Taille</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Uploadé</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-t border-gray-100 dark:border-slate-700/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl" aria-hidden="true">{getMimeIcon(f.mimeType)}</span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-xs">{f.name}</p>
                          <p className="text-xs text-gray-400 font-mono truncate max-w-xs">{f.mimeType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                      {f.ownerName ?? f.ownerEmail}
                      <div className="text-gray-400">{f.ownerEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums">
                      {formatBytes(f.sizeBytes)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(f.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handlePurge(f)}
                        className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                        aria-label={`Purger ${f.name}`}
                        type="button"
                        title="Purger définitivement"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-2" aria-label="Pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-sm"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Précédent
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary px-3 py-1.5 text-sm"
            type="button"
          >
            Suivant <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    READY: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
    PENDING: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    SCANNING: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
    QUARANTINED: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    DELETED: 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400',
  }
  return <span className={`badge ${map[status] ?? map.DELETED}`}>{status}</span>
}
