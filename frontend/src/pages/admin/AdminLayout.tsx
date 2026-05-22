import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Files, Share2, ScrollText, Activity,
  Cloud, LogOut, Sun, Moon, MonitorSmartphone, Home,
} from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { useAuthStore } from '../../store/auth.store'
import { useTheme } from '../../hooks/useTheme'
import { authApi } from '../../api'
import { toast } from 'sonner'

const navItems = [
  { to: '/admin', label: 'Vue d\'ensemble', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/files', label: 'Fichiers', icon: Files },
  { to: '/admin/shares', label: 'Partages', icon: Share2 },
  { to: '/admin/logs', label: 'Logs d\'accès', icon: ScrollText },
  { to: '/admin/system', label: 'Système', icon: Activity },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { theme, cycle } = useTheme()
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : MonitorSmartphone

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      try { await authApi.logout(refreshToken) } catch { /* noop */ }
    }
    logout()
    toast.success('Déconnecté')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="flex h-screen overflow-hidden">
        <aside className="w-64 bg-white dark:bg-slate-800 border-r border-gray-100 dark:border-slate-700 flex flex-col flex-shrink-0">
          <div className="p-6 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <span className="font-bold text-gray-900 dark:text-gray-100">FileShare</span>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium leading-none">
                  Mode administrateur
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                         bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300
                         border border-blue-200 dark:border-blue-800/60
                         hover:bg-blue-100 dark:hover:bg-blue-900/50
                         transition-all duration-150 active:scale-95
                         focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              type="button"
              title="Revenir à l'application utilisateur"
            >
              <Home className="w-4 h-4" aria-hidden="true" />
              Retour à l'app
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1" aria-label="Navigation admin">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-gray-100'}`
                }
              >
                <item.icon className="w-4 h-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {user && (
                <button
                  onClick={() => navigate('/profile')}
                  className="rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500"
                  aria-label="Mon profil"
                  type="button"
                  title="Mon profil"
                >
                  <Avatar user={user} size="sm" />
                </button>
              )}
              <button
                onClick={() => navigate('/profile')}
                className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                type="button"
                aria-label="Voir mon profil"
              >
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {user?.name ?? user?.email}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 capitalize">
                  {user?.role?.toLowerCase()}
                </p>
              </button>
              <button
                onClick={cycle}
                className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700"
                aria-label={`Thème : ${theme}`}
                type="button"
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

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
