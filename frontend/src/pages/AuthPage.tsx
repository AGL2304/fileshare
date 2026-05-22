import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Cloud, Loader2, Eye, EyeOff } from 'lucide-react'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { authApi } from '../api'
import { useAuthStore } from '../store/auth.store'

type Mode = 'login' | 'register'

export default function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { setTokens, setUser } = useAuthStore()

  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const justRegistered = new URLSearchParams(location.search).get('registered') === '1'

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ email: form.email, password: form.password }),
    onSuccess: (res) => {
      const payload = res.data.data
      if (!payload) return
      setTokens(payload.accessToken, payload.refreshToken)
      setUser(payload.user)
      toast.success('Connexion réussie')
      navigate('/')
    },
    onError: (err) => {
      const message =
        (err as AxiosError<{ message?: string }>)?.response?.data?.message ?? 'Erreur de connexion'
      setError(message)
    },
  })

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register({
        email: form.email,
        password: form.password,
        name: form.name || undefined,
      }),
    onSuccess: () => {
      toast.success('Compte créé')
      navigate('/login?registered=1')
    },
    onError: (err) => {
      const message =
        (err as AxiosError<{ message?: string }>)?.response?.data?.message ??
        "Erreur lors de l'inscription"
      setError(message)
    },
  })

  const isLoading = loginMutation.isPending || registerMutation.isPending

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (mode === 'login') loginMutation.mutate()
    else registerMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Cloud className="w-7 h-7 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">FileShare</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {mode === 'login' ? 'Connectez-vous à votre compte' : 'Créer un compte gratuit'}
          </p>
        </div>

        <div className="card p-8">
          {justRegistered && mode === 'login' && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
              Compte créé. Connectez-vous.
            </div>
          )}

          {error && (
            <div
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm"
              role="alert"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nom complet
                </label>
                <input
                  id="auth-name"
                  className="input"
                  type="text"
                  placeholder="Jean Dupont"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Email
              </label>
              <input
                id="auth-email"
                className="input"
                type="email"
                placeholder="vous@exemple.com"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  className="input pr-10"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'register' ? '8 caractères minimum' : '••••••••'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Au moins une majuscule et un chiffre
                </p>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" aria-hidden="true" />
                  Chargement...
                </>
              ) : mode === 'login' ? (
                'Se connecter'
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
            {mode === 'login' ? (
              <>
                Pas encore de compte ?{' '}
                <Link to="/register" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  S'inscrire
                </Link>
              </>
            ) : (
              <>
                Déjà un compte ?{' '}
                <Link to="/login" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                  Se connecter
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
