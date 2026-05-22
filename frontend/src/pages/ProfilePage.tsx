import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import {
  ArrowLeft, Camera, Trash2, Mail, KeyRound, User as UserIcon,
  Save, Loader2, AlertCircle,
} from 'lucide-react'
import { AxiosError } from 'axios'
import { toast } from 'sonner'
import { profileApi, authApi } from '../api'
import { useAuthStore } from '../store/auth.store'
import { Avatar } from '../components/ui/Avatar'
import { confirm } from '../components/ui/ConfirmDialog'

const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, setUser, logout } = useAuthStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarVersion, setAvatarVersion] = useState(Date.now())

  // Hydrate user if missing
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

  // ─── Avatar ────────────────────────────────────────────────────────
  const uploadMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: () => {
      setAvatarVersion(Date.now())
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Avatar mis à jour')
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>
      toast.error(ax.response?.data?.message ?? 'Échec de l\'upload')
    },
  })

  const removeAvatarMutation = useMutation({
    mutationFn: () => profileApi.deleteAvatar(),
    onSuccess: () => {
      if (user) setUser({ ...user, avatarKey: null, avatarUrl: null })
      setAvatarVersion(Date.now())
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Avatar supprimé')
    },
    onError: () => toast.error('Échec de la suppression'),
  })

  const handleFile = (file: File) => {
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Seuls JPEG, PNG et WebP sont acceptés')
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error('L\'image dépasse 2 Mo')
      return
    }
    uploadMutation.mutate(file)
  }

  const handleRemove = async () => {
    const ok = await confirm({
      title: 'Supprimer l\'avatar ?',
      message: 'Votre photo de profil sera retirée.',
      confirmLabel: 'Supprimer',
      variant: 'danger',
    })
    if (ok) removeAvatarMutation.mutate()
  }

  // ─── Render ────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" aria-label="Chargement" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary px-3 py-2"
            type="button"
            aria-label="Retour"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Retour
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mon profil</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gérez vos informations personnelles et votre sécurité
            </p>
          </div>
        </div>

        {/* Avatar section */}
        <section className="card p-6" aria-labelledby="avatar-heading">
          <h2 id="avatar-heading" className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Photo de profil
          </h2>
          <div className="flex items-center gap-5">
            <Avatar user={user} size="xl" version={avatarVersion} />
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-secondary text-sm"
                  type="button"
                  disabled={uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Camera className="w-4 h-4" aria-hidden="true" />
                  )}
                  Changer
                </button>
                {(user.avatarKey || user.avatarUrl) && (
                  <button
                    onClick={handleRemove}
                    className="btn-danger text-sm"
                    type="button"
                    disabled={removeAvatarMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Retirer
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                JPEG, PNG ou WebP · 2 Mo max
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
                aria-label="Sélectionner une image"
              />
            </div>
          </div>
        </section>

        {/* Identity */}
        <NameSection currentName={user.name} />

        {/* Email */}
        <EmailSection currentEmail={user.email} onSuccess={() => { logout(); navigate('/login') }} />

        {/* Password */}
        <PasswordSection onSuccess={() => { logout(); navigate('/login') }} />
      </div>
    </div>
  )
}

// ─── Name ─────────────────────────────────────────────────────────────

function NameSection({ currentName }: { currentName: string | null }) {
  const queryClient = useQueryClient()
  const { setUser, user } = useAuthStore()
  const [name, setName] = useState(currentName ?? '')

  const mutation = useMutation({
    mutationFn: (next: string | null) => profileApi.updateName({ name: next }),
    onSuccess: (res) => {
      const updated = res.data.data
      if (user && updated) setUser({ ...user, name: updated.name })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Nom mis à jour')
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>
      toast.error(ax.response?.data?.message ?? 'Échec')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    mutation.mutate(trimmed || null)
  }

  return (
    <section className="card p-6" aria-labelledby="name-heading">
      <h2 id="name-heading" className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
        <UserIcon className="w-4 h-4 text-gray-500" aria-hidden="true" />
        Nom affiché
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Comment vous apparaissez dans l'app
      </p>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Votre nom"
          maxLength={100}
          aria-label="Nom"
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending || name === (currentName ?? '')}
        >
          {mutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="w-4 h-4" aria-hidden="true" />
          )}
          Enregistrer
        </button>
      </form>
    </section>
  )
}

// ─── Email ────────────────────────────────────────────────────────────

function EmailSection({ currentEmail, onSuccess }: { currentEmail: string; onSuccess: () => void }) {
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => profileApi.updateEmail({ newEmail, currentPassword: password }),
    onSuccess: () => {
      toast.success('Email mis à jour — reconnexion requise')
      setTimeout(onSuccess, 1500)
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>
      setError(ax.response?.data?.message ?? 'Échec')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate()
  }

  return (
    <section className="card p-6" aria-labelledby="email-heading">
      <h2 id="email-heading" className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
        <Mail className="w-4 h-4 text-gray-500" aria-hidden="true" />
        Adresse email
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Actuelle : <span className="font-mono text-gray-700 dark:text-gray-300">{currentEmail}</span>
      </p>

      <form onSubmit={submit} className="space-y-3">
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="new-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Nouvel email
          </label>
          <input
            id="new-email"
            type="email"
            className="input"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="nouvelle.adresse@exemple.com"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="email-pwd" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Mot de passe actuel <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="email-pwd"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Confirmez votre identité"
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending || !newEmail || !password}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
          Modifier l'email
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Toutes vos sessions seront invalidées et vous devrez vous reconnecter.
        </p>
      </form>
    </section>
  )
}

// ─── Password ─────────────────────────────────────────────────────────

function PasswordSection({ onSuccess }: { onSuccess: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew, setConfirmNew] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => profileApi.changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Mot de passe mis à jour — reconnexion requise')
      setTimeout(onSuccess, 1500)
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>
      const fieldErr = ax.response?.data?.errors?.newPassword?.[0]
      setError(fieldErr ?? ax.response?.data?.message ?? 'Échec')
    },
  })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmNew) {
      setError('La confirmation ne correspond pas')
      return
    }
    mutation.mutate()
  }

  return (
    <section className="card p-6" aria-labelledby="password-heading">
      <h2 id="password-heading" className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-gray-500" aria-hidden="true" />
        Mot de passe
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Au moins 8 caractères, une majuscule et un chiffre
      </p>

      <form onSubmit={submit} className="space-y-3">
        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="cur-pwd" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Mot de passe actuel <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="cur-pwd"
            type="password"
            className="input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <div>
          <label htmlFor="new-pwd" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Nouveau mot de passe
          </label>
          <input
            id="new-pwd"
            type="password"
            className="input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirm-pwd" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Confirmer le nouveau mot de passe
          </label>
          <input
            id="confirm-pwd"
            type="password"
            className="input"
            value={confirmNew}
            onChange={(e) => setConfirmNew(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            aria-invalid={!!confirmNew && newPassword !== confirmNew}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={mutation.isPending || !currentPassword || !newPassword || !confirmNew}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
          Changer le mot de passe
        </button>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          Toutes vos sessions seront invalidées et vous devrez vous reconnecter.
        </p>
      </form>
    </section>
  )
}
