import { useQuery } from '@tanstack/react-query'
import { Activity, Database, Cpu, MemoryStick, Clock, RefreshCw } from 'lucide-react'
import { adminApi } from '../../api'
import { formatBytes } from '../../utils/format'

interface SystemInfo {
  server: {
    uptime: number
    nodeVersion: string
    memory: { rss: number; heapUsed: number; heapTotal: number }
    platform: string
    arch: string
  }
  database: { ok: boolean; latencyMs: number; version: string }
  env: string
  now: string
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts = []
  if (d) parts.push(`${d}j`)
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

export default function AdminSystem() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'system'],
    queryFn: () => adminApi.system(),
    refetchInterval: 10_000,
  })

  const info: SystemInfo | undefined = data?.data?.data

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-600" aria-hidden="true" />
            Système
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Diagnostic en temps réel • rafraîchi toutes les 10s
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-sm"
          disabled={isFetching}
          type="button"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          Rafraîchir
        </button>
      </div>

      {isLoading || !info ? (
        <div className="card p-8 text-center text-gray-400">Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card icon={Clock} title="Uptime" value={formatUptime(info.server.uptime)} />
          <Card icon={Cpu} title="Plateforme" value={`${info.server.platform} ${info.server.arch}`} hint={`Node ${info.server.nodeVersion}`} />

          <Card
            icon={MemoryStick}
            title="Mémoire"
            value={formatBytes(info.server.memory.heapUsed)}
            hint={`Heap total ${formatBytes(info.server.memory.heapTotal)} · RSS ${formatBytes(info.server.memory.rss)}`}
          />

          <Card
            icon={Database}
            title="Base de données"
            value={info.database.ok ? 'Connectée' : 'KO'}
            hint={`PostgreSQL ${info.database.version} · ${info.database.latencyMs} ms`}
            color={info.database.ok ? 'green' : 'red'}
          />

          <div className="card p-5 md:col-span-2">
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium mb-2">
              Environnement
            </p>
            <div className="flex items-center justify-between">
              <span className="badge bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-mono">
                {info.env}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {new Date(info.now).toISOString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Card({
  icon: Icon, title, value, hint, color = 'blue',
}: {
  icon: React.ElementType
  title: string
  value: string
  hint?: string
  color?: 'blue' | 'green' | 'red'
}) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300',
    green: 'text-green-600 bg-green-50 dark:bg-green-900/40 dark:text-green-300',
    red: 'text-red-600 bg-red-50 dark:bg-red-900/40 dark:text-red-300',
  }
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-medium">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}
