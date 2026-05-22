import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Search, ChevronLeft, ChevronRight, ShieldCheck, ShieldOff,
  Trash2, Edit3, X, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi, AdminRole } from '../../api'
import { formatBytes, formatDate } from '../../utils/format'
import { Modal } from '../../components/ui/Modal'
import { confirm } from '../../components/ui/ConfirmDialog'

interface AdminUser {
  id: string
  email: string
  name: string | null
  role: AdminRole
  quotaBytes: string
  usedBytes: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: { files: number; shares: number }
}

const ROLES: AdminRole[] = ['GUEST', 'USER', 'PREMIUM', 'ADMIN']

export default function AdminUsers() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<AdminRole | ''>('')
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', { page, search, roleFilter }],
    queryFn: () => adminApi.users.list({
      page,
      limit: 20,
      search: search || undefined,
      role: roleFilter || undefined,
    }),
  })

  const users: AdminUser[] = data?.data?.data ?? []
  const total: number = data?.data?.total ?? 0
  const totalPages: number = data?.data?.totalPages ?? 1

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof adminApi.users.update>[1] }) =>
      adminApi.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Utilisateur mis à jour')
      setEditingUser(null)
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Échec de la mise à jour')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      toast.success('Utilisateur supprimé')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err.response?.data?.message ?? 'Échec de la suppression')
    },
  })

  const handleToggleActive = async (user: AdminUser) => {
    const action = user.isActive ? 'Suspendre' : 'Réactiver'
    const ok = await confirm({
      title: `${action} ce compte ?`,
      message: user.isActive
        ? `${user.email} ne pourra plus se connecter et ses sessions seront révoquées.`
        : `${user.email} pourra à nouveau accéder à l'app.`,
      confirmLabel: action,
      variant: user.isActive ? 'danger' : 'primary',
    })
    if (ok) updateMutation.mutate({ id: user.id, data: { isActive: !user.isActive } })
  }

  const handleDelete = async (user: AdminUser) => {
    const ok = await confirm({
      title: 'Supprimer définitivement ce compte ?',
      message: `${user.email} et TOUS ses fichiers (${user._count.files}) et partages (${user._count.shares}) seront supprimés. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    })
    if (ok) deleteMutation.mutate(user.id)
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" aria-hidden="true" />
            Utilisateurs
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} compte{total > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="search-users" className="sr-only">Rechercher</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            id="search-users"
            type="search"
            className="input pl-9"
            placeholder="Rechercher par email ou nom..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="input sm:w-40"
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as AdminRole | ''); setPage(1) }}
          aria-label="Filtrer par rôle"
        >
          <option value="">Tous rôles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">Chargement…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500">Aucun utilisateur</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Quota</th>
                  <th className="px-4 py-3">Stats</th>
                  <th className="px-4 py-3">Inscrit</th>
                  <th className="px-4 py-3">Actif</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 dark:border-slate-700/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{u.name ?? '—'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        u.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' :
                        u.role === 'PREMIUM' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' :
                        'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 tabular-nums">
                      <div className="text-xs">{formatBytes(u.usedBytes)} / {formatBytes(u.quotaBytes)}</div>
                      <div className="h-1 bg-gray-100 dark:bg-slate-700 rounded-full mt-1 max-w-[120px] overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${Math.min(100, (parseInt(u.usedBytes) / Math.max(1, parseInt(u.quotaBytes))) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {u._count.files} fichier{u._count.files !== 1 ? 's' : ''}<br />
                      {u._count.shares} partage{u._count.shares !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <span className="badge bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                          <Check className="w-3 h-3" aria-hidden="true" /> Actif
                        </span>
                      ) : (
                        <span className="badge bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                          <X className="w-3 h-3" aria-hidden="true" /> Suspendu
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="btn-ghost p-1.5 rounded-md"
                          aria-label={`Modifier ${u.email}`}
                          type="button"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className="btn-ghost p-1.5 rounded-md"
                          aria-label={u.isActive ? `Suspendre ${u.email}` : `Réactiver ${u.email}`}
                          type="button"
                          title={u.isActive ? 'Suspendre' : 'Réactiver'}
                        >
                          {u.isActive
                            ? <ShieldOff className="w-4 h-4 text-orange-500" aria-hidden="true" />
                            : <ShieldCheck className="w-4 h-4 text-green-600" aria-hidden="true" />}
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
                          aria-label={`Supprimer ${u.email}`}
                          type="button"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
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

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={(data) => updateMutation.mutate({ id: editingUser.id, data })}
          isSaving={updateMutation.isPending}
        />
      )}
    </div>
  )
}

function EditUserModal({
  user, onClose, onSave, isSaving,
}: {
  user: AdminUser
  onClose: () => void
  onSave: (data: { role: AdminRole; quotaBytes: string; name: string | null }) => void
  isSaving: boolean
}) {
  const [role, setRole] = useState<AdminRole>(user.role)
  const [quotaGb, setQuotaGb] = useState(
    (parseInt(user.quotaBytes) / (1024 ** 3)).toFixed(2)
  )
  const [name, setName] = useState(user.name ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const bytes = Math.round(parseFloat(quotaGb) * 1024 ** 3)
    onSave({
      role,
      quotaBytes: String(bytes),
      name: name || null,
    })
  }

  return (
    <Modal open onClose={onClose} title={`Modifier ${user.email}`}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Nom
          </label>
          <input
            id="edit-name"
            type="text"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="—"
          />
        </div>

        <div>
          <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Rôle
          </label>
          <select
            id="edit-role"
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value as AdminRole)}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="edit-quota" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Quota (Go)
          </label>
          <input
            id="edit-quota"
            type="number"
            min="0"
            step="0.1"
            className="input"
            value={quotaGb}
            onChange={(e) => setQuotaGb(e.target.value)}
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            Utilisé : {formatBytes(user.usedBytes)}
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={isSaving}>
            {isSaving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
