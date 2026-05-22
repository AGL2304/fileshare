import { useQuery } from '@tanstack/react-query'
import { Users, Files, Share2, HardDrive, TrendingUp, Clock } from 'lucide-react'
import { adminApi } from '../../api'
import { formatBytes, formatDate, fromNow } from '../../utils/format'

interface Stats {
  users: { total: number; active: number; suspended: number }
  files: { total: number; active: number; deleted: number; totalBytes: string }
  shares: { total: number; active: number; revoked: number }
  storage: { usedBytes: string; quotaBytes: string }
  accessLogs: { total: number }
  recentUsers: Array<{ id: string; email: string; name: string | null; role: string; createdAt: string }>
  recentFiles: Array<{ id: string; name: string; mimeType: string; sizeBytes: string; ownerEmail: string; createdAt: string }>
  recentLogs: Array<{ id: string; action: string; ipAddress: string; userAgent: string | null; accessedAt: string; fileName: string; fileId: string }>
}

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.stats(),
    refetchInterval: 15_000,
  })

  const stats: Stats | undefined = data?.data?.data

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vue d'ensemble</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Statistiques globales de l'application • mises à jour toutes les 15s
        </p>
      </div>

      {isLoading || !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Utilisateurs"
              value={stats.users.total}
              hint={`${stats.users.active} actifs · ${stats.users.suspended} suspendus`}
              color="blue"
            />
            <StatCard
              icon={Files}
              label="Fichiers"
              value={stats.files.active}
              hint={`${stats.files.deleted} dans la corbeille`}
              color="green"
            />
            <StatCard
              icon={Share2}
              label="Partages"
              value={stats.shares.active}
              hint={`${stats.shares.revoked} révoqués`}
              color="purple"
            />
            <StatCard
              icon={HardDrive}
              label="Stockage utilisé"
              value={formatBytes(stats.files.totalBytes)}
              hint={`sur ${formatBytes(stats.storage.quotaBytes)} alloués`}
              color="orange"
              isStringValue
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" aria-hidden="true" />
                Inscriptions récentes
              </h2>
              {stats.recentUsers.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun utilisateur</p>
              ) : (
                <ul className="space-y-2">
                  {stats.recentUsers.map((u) => (
                    <li key={u.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-100 truncate">
                          {u.name ?? u.email}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <span className="inline-block badge bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">
                          {u.role}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{fromNow(u.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card p-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Files className="w-4 h-4" aria-hidden="true" />
                Derniers fichiers uploadés
              </h2>
              {stats.recentFiles.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun fichier</p>
              ) : (
                <ul className="space-y-2">
                  {stats.recentFiles.map((f) => (
                    <li key={f.id} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-gray-100 truncate">{f.name}</p>
                        <p className="text-xs text-gray-400 truncate">par {f.ownerEmail}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatBytes(f.sizeBytes)}</p>
                        <p className="text-xs text-gray-400">{fromNow(f.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" aria-hidden="true" />
              Derniers accès
            </h2>
            {stats.recentLogs.length === 0 ? (
              <p className="text-sm text-gray-400">Aucun accès enregistré</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <tr className="border-b border-gray-100 dark:border-slate-700">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Action</th>
                      <th className="py-2 pr-4">Fichier</th>
                      <th className="py-2 pr-4">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentLogs.map((l) => (
                      <tr key={l.id} className="border-b border-gray-50 dark:border-slate-700/50 last:border-0">
                        <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">
                          {formatDate(l.accessedAt)}
                        </td>
                        <td className="py-2 pr-4">
                          <span className="badge bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                            {l.action}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-gray-700 dark:text-gray-200 truncate max-w-xs">
                          {l.fileName}
                        </td>
                        <td className="py-2 pr-4 text-gray-500 dark:text-gray-400 font-mono text-xs">
                          {l.ipAddress}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon, label, value, hint, color, isStringValue,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  hint?: string
  color: 'blue' | 'green' | 'purple' | 'orange'
  isStringValue?: boolean
}) {
  const colorMap = {
    blue: 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300',
    green: 'bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-300',
    purple: 'bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300',
    orange: 'bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300',
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
      <p className={`font-bold text-gray-900 dark:text-gray-100 ${isStringValue ? 'text-lg' : 'text-2xl'} tabular-nums`}>
        {value}
      </p>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}
