import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Home, Link as LinkIcon, Trash, LogOut,
  Plus, Search, Cloud, Sun, Moon, MonitorSmartphone, Shield,
} from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth.store'
import { UploadDropzone } from '../components/files/UploadDropzone'
import { FileList } from '../components/files/FileList'
import { formatBytes, quotaPercent } from '../utils/format'
import { useTheme } from '../hooks/useTheme'
import { toast } from 'sonner'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuthStore()
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const { theme, cycle } = useTheme()

  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await authApi.me()
      const u = res.data.data
      if (u) setUser(u)
      return u
    },
    enabled: !user,
  })

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try { await authApi.logout(refreshToken) } catch { /* noop */ }
    }
    logout()
    toast.success('Déconnecté')
    navigate('/login')
  }

  const usedPct = user ? quotaPercent(user.usedBytes, user.quotaBytes) : 0
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : MonitorSmartphone

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex flex-col flex-shrink-0">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <span className="font-bold text-gray-900 dark:text-gray-100">FileShare</span>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1" aria-label="Navigation principale">
            <NavItem icon={Home} label="Mes fichiers" active />
            <NavItem icon={LinkIcon} label="Mes partages" onClick={() => navigate('/shares')} />
            <NavItem icon={Trash} label="Corbeille" disabled />
            {user?.role === 'ADMIN' && (
              <NavItem icon={Shield} label="Administration" onClick={() => navigate('/admin')} />
            )}
          </nav>

          {user && (
            <div className="p-4 border-t border-gray-100 dark:border-slate-700">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Stockage</span>
                  <span className="tabular-nums">
                    {formatBytes(user.usedBytes)} / {formatBytes(user.quotaBytes)}
                  </span>
                </div>
                <div
                  className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden"
                  role="progressbar"
                  aria-valuenow={usedPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${usedPct}% utilisé`}
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      usedPct > 80 ? 'bg-red-500' : usedPct > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">{usedPct}% utilisé</p>
              </div>
            </div>
          )}

          <div className="p-4 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-sm">
                {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {user?.name ?? user?.email}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                  {user?.role?.toLowerCase()}
                </p>
              </div>
              <button
                onClick={cycle}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                aria-label={`Thème actuel : ${theme}. Cliquez pour changer.`}
                type="button"
                title={`Thème : ${theme}`}
              >
                <ThemeIcon className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                aria-label="Déconnexion"
                type="button"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mes fichiers</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Bonjour {user?.name ?? user?.email?.split('@')[0]}
                </p>
              </div>
              <button
                onClick={() => setShowUpload((v) => !v)}
                className="btn-primary"
                type="button"
                aria-expanded={showUpload}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Uploader
              </button>
            </div>

            {showUpload && (
              <div className="card p-5">
                <UploadDropzone onUploaded={() => setShowUpload(false)} />
              </div>
            )}

            <div className="relative">
              <label htmlFor="file-search" className="sr-only">Rechercher un fichier</label>
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                aria-hidden="true"
              />
              <input
                id="file-search"
                className="input pl-9"
                placeholder="Rechercher un fichier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                type="search"
              />
            </div>

            <FileList search={search || undefined} />
          </div>
        </main>
      </div>
    </div>
  )
}

function NavItem({
  icon: Icon, label, active, onClick, disabled,
}: {
  icon: React.ElementType
  label: string
  active?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${active
          ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100'}
        disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className="w-4 h-4" aria-hidden="true" />
      {label}
    </button>
  )
}
