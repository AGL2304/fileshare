import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ScrollText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { adminApi } from '../../api'
import { formatDate } from '../../utils/format'

interface AccessLog {
  id: string
  action: string
  ipAddress: string
  userAgent: string | null
  accessedAt: string
  fileId: string
  file: { id: string; name: string }
  share: { id: string; token: string } | null
}

export default function AdminLogs() {
  const [page, setPage] = useState(1)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'access-logs', { page }],
    queryFn: () => adminApi.accessLogs.list({ page, limit: 50 }),
    refetchInterval: 30_000,
  })

  const logs: AccessLog[] = data?.data?.data ?? []
  const total: number = data?.data?.total ?? 0
  const totalPages: number = data?.data?.totalPages ?? 1

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-amber-600" aria-hidden="true" />
            Logs d'accès
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {total} entrée{total > 1 ? 's' : ''} • rafraîchi auto. toutes les 30s
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-sm"
          type="button"
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          Rafraîchir
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun log</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Fichier</th>
                  <th className="px-4 py-3">Via partage</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3">User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-gray-100 dark:border-slate-700/60">
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                      {formatDate(l.accessedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200 truncate max-w-xs">
                      {l.file?.name ?? <span className="text-gray-400 italic">(supprimé)</span>}
                    </td>
                    <td className="px-4 py-3">
                      {l.share ? (
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {l.share.token.slice(0, 8)}…
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">
                      {l.ipAddress}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs" title={l.userAgent ?? ''}>
                      {l.userAgent ?? '—'}
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
