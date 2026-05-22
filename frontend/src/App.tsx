import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { ConfirmDialogProvider } from './components/ui/ConfirmDialog'
import { useTheme } from './hooks/useTheme'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import SharesPage from './pages/SharesPage'
import SharePage from './pages/SharePage'
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminFiles from './pages/admin/AdminFiles'
import AdminShares from './pages/admin/AdminShares'
import AdminLogs from './pages/admin/AdminLogs'
import AdminSystem from './pages/admin/AdminSystem'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ThemeInit() {
  useTheme()
  return null
}

export default function App() {
  useEffect(() => {
    const html = document.documentElement
    const observer = new MutationObserver(() => {
      const isDark = html.classList.contains('dark')
      html.dataset.theme = isDark ? 'dark' : 'light'
    })
    observer.observe(html, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfirmDialogProvider>
          <ThemeInit />
          <Toaster position="bottom-right" richColors closeButton theme="system" />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
              <Route path="/share/:token" element={<SharePage />} />
              <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/shares" element={<ProtectedRoute><SharesPage /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="files" element={<AdminFiles />} />
                <Route path="shares" element={<AdminShares />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="system" element={<AdminSystem />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ConfirmDialogProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
