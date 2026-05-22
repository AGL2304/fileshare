import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth.store'
import { authApi } from '../api'

/**
 * Guards a route to ADMIN-only access.
 * Hydrates the user via /auth/me if unknown, then checks role.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, setUser } = useAuthStore()

  const { isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await authApi.me()
      const u = res.data.data
      if (u) setUser(u)
      return u
    },
    enabled: isAuthenticated && !user,
  })

  if (!isAuthenticated) return <Navigate to="/login" replace />

  if (isLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />

  return <>{children}</>
}
