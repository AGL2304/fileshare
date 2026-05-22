import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Download, Share2, Trash2, LayoutGrid, List, Search, FileX,
  Copy, Check, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { filesApi, sharesApi } from '../../api'
import { formatBytes, fromNow, getMimeIcon } from '../../utils/format'
import { Modal } from '../ui/Modal'
import { confirm } from '../ui/ConfirmDialog'

interface FileItem {
  id: string
  name: string
  mimeType: string
  sizeBytes: string
  status: string
  createdAt: string
}

interface ShareModalState {
  fileId: string
  fileName: string
}

export function FileList({ folderId, search }: { folderId?: string; search?: string }) {
  const queryClient = useQueryClient()
  const [shareModal, setShareModal] = useState<ShareModalState | null>(null)
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['files', { folderId, search, page }],
    queryFn: () => filesApi.list({ folderId, search, page, limit: 20 }),
  })

  const deleteMutation = useMutation({
    mutationFn: filesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
      queryClient.invalidateQueries({ queryKey: ['me'] })
      toast.success('Fichier supprimé')
    },
    onError: () => toast.error('Échec de la suppression'),
  })

  const handleDownload = async (file: FileItem) => {
    try {
      await filesApi.download(file.id, file.name)
    } catch {
      toast.error('Échec du téléchargement')
    }
  }

  const files: FileItem[] = data?.data?.data ?? []
  const total: number = data?.data?.total ?? 0
  const totalPages: number = data?.data?.totalPages ?? 1

  const handleDelete = async (file: FileItem) => {
    const ok = await confirm({
      title: 'Supprimer ce fichier ?',
      message: `"${file.name}" sera déplacé dans la corbeille.`,
      confirmLabel: 'Supprimer',
      variant: 'danger',
    })
    if (ok) deleteMutation.mutate(file.id)
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Chargement des fichiers">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
                <div className="h-2 bg-gray-100 dark:bg-slate-700/60 rounded w-1/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <FileX className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" aria-hidden="true" />
        <p className="font-medium">Aucun fichier</p>
        <p className="text-sm">
          {search ? 'Aucun résultat pour cette recherche' : 'Uploadez votre premier fichier ci-dessus'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} fichier{total > 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 p-0.5 rounded-lg" role="group" aria-label="Mode d'affichage">
          <button
            onClick={() => setView('list')}
            className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
            aria-pressed={view === 'list'}
            aria-label="Vue liste"
            type="button"
          >
            <List className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <button
            onClick={() => setView('grid')}
            className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-700/50'}`}
            aria-pressed={view === 'grid'}
            aria-label="Vue grille"
            type="button"
          >
            <LayoutGrid className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <ul className="space-y-1">
          {files.map((file) => (
            <li
              key={file.id}
              className="card p-3 flex items-center gap-3 hover:shadow-md transition-shadow group"
            >
              <span className="text-2xl flex-shrink-0" aria-hidden="true">
                {getMimeIcon(file.mimeType)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{file.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {formatBytes(file.sizeBytes)} · {fromNow(file.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(file)}
                  className="btn-ghost p-2 rounded-lg"
                  aria-label={`Télécharger ${file.name}`}
                  type="button"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setShareModal({ fileId: file.id, fileName: file.name })}
                  className="btn-ghost p-2 rounded-lg"
                  aria-label={`Partager ${file.name}`}
                  type="button"
                >
                  <Share2 className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                  aria-label={`Supprimer ${file.name}`}
                  type="button"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {files.map((file) => (
            <li
              key={file.id}
              className="card p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow group"
            >
              <span className="text-4xl" aria-hidden="true">{getMimeIcon(file.mimeType)}</span>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-200 text-center truncate w-full" title={file.name}>
                {file.name}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(file.sizeBytes)}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(file)}
                  className="btn-ghost text-xs px-2 py-1"
                  aria-label={`Télécharger ${file.name}`}
                  type="button"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                </button>
                <button
                  onClick={() => setShareModal({ fileId: file.id, fileName: file.name })}
                  className="btn-ghost text-xs px-2 py-1"
                  aria-label={`Partager ${file.name}`}
                  type="button"
                >
                  <Share2 className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-4" aria-label="Pagination">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-sm"
            aria-label="Page précédente"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Précédent
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary px-3 py-1.5 text-sm"
            aria-label="Page suivante"
            type="button"
          >
            Suivant
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      {shareModal && (
        <ShareModal
          fileId={shareModal.fileId}
          fileName={shareModal.fileName}
          onClose={() => setShareModal(null)}
        />
      )}
    </div>
  )
}

// ── Share Modal ───────────────────────────────────────────────────────

function ShareModal({
  fileId, fileName, onClose,
}: { fileId: string; fileName: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [options, setOptions] = useState({
    permission: 'DOWNLOAD' as 'VIEW' | 'DOWNLOAD',
    password: '',
    expiresIn: '',
    maxDownloads: '',
  })
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)

  const shareMutation = useMutation({
    mutationFn: () => {
      const expiresAt = options.expiresIn
        ? new Date(Date.now() + parseInt(options.expiresIn) * 3600000).toISOString()
        : undefined
      return sharesApi.create({
        fileId,
        permission: options.permission,
        password: options.password || undefined,
        expiresAt,
        maxDownloads: options.maxDownloads ? parseInt(options.maxDownloads) : undefined,
      })
    },
    onSuccess: (res) => {
      setShareUrl(res.data.data.shareUrl)
      queryClient.invalidateQueries({ queryKey: ['shares'] })
      toast.success('Lien de partage créé')
    },
    onError: () => toast.error('Impossible de créer le lien'),
  })

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast.success('Lien copié')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Impossible de copier')
    }
  }

  return (
    <Modal open onClose={onClose} title="Partager un fichier" description={fileName}>
      {!shareUrl ? (
        <div className="space-y-4">
          <div>
            <label htmlFor="share-permission" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Permission
            </label>
            <select
              id="share-permission"
              className="input"
              value={options.permission}
              onChange={(e) => setOptions({ ...options, permission: e.target.value as 'VIEW' | 'DOWNLOAD' })}
            >
              <option value="DOWNLOAD">Téléchargement autorisé</option>
              <option value="VIEW">Lecture seule</option>
            </select>
          </div>

          <div>
            <label htmlFor="share-pwd" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Mot de passe (optionnel)
            </label>
            <input
              id="share-pwd"
              className="input"
              type="password"
              placeholder="Laisser vide si aucun"
              autoComplete="new-password"
              value={options.password}
              onChange={(e) => setOptions({ ...options, password: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="share-exp" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Expiration
            </label>
            <select
              id="share-exp"
              className="input"
              value={options.expiresIn}
              onChange={(e) => setOptions({ ...options, expiresIn: e.target.value })}
            >
              <option value="">Jamais</option>
              <option value="1">1 heure</option>
              <option value="24">24 heures</option>
              <option value="168">7 jours</option>
              <option value="720">30 jours</option>
            </select>
          </div>

          <div>
            <label htmlFor="share-max" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Max téléchargements
            </label>
            <input
              id="share-max"
              className="input"
              type="number"
              min="1"
              placeholder="Illimité"
              value={options.maxDownloads}
              onChange={(e) => setOptions({ ...options, maxDownloads: e.target.value })}
            />
          </div>

          <button
            className="btn-primary w-full justify-center"
            onClick={() => shareMutation.mutate()}
            disabled={shareMutation.isPending}
            type="button"
          >
            {shareMutation.isPending ? 'Génération…' : 'Générer le lien'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Lien créé avec succès
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 break-all font-mono">{shareUrl}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={copyUrl} className="btn-primary flex-1 justify-center" type="button">
              {copied ? <><Check className="w-4 h-4" aria-hidden="true" /> Copié</> :
                <><Copy className="w-4 h-4" aria-hidden="true" /> Copier le lien</>}
            </button>
            <button onClick={onClose} className="btn-secondary" type="button">Fermer</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// Search icon export for the dashboard
export { Search as SearchIcon }
