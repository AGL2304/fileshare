import { useCallback, useState } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { useQueryClient } from '@tanstack/react-query'
import { Upload, Check, X, FileWarning } from 'lucide-react'
import { toast } from 'sonner'
import { filesApi } from '../../api'
import { formatBytes } from '../../utils/format'

type UploadStatus = 'pending' | 'uploading' | 'done' | 'error'

interface UploadEntry {
  id: string
  file: File
  progress: number
  status: UploadStatus
  error?: string
}

interface DropzoneProps {
  folderId?: string
  onUploaded?: () => void
}

const MAX_SIZE = 100 * 1024 * 1024

export function UploadDropzone({ folderId, onUploaded }: DropzoneProps) {
  const queryClient = useQueryClient()
  const [queue, setQueue] = useState<UploadEntry[]>([])

  const updateEntry = useCallback((id: string, update: Partial<UploadEntry>) => {
    setQueue((q) => q.map((f) => (f.id === id ? { ...f, ...update } : f)))
  }, [])

  const removeEntry = useCallback((id: string) => {
    setQueue((q) => q.filter((f) => f.id !== id))
  }, [])

  const uploadOne = useCallback(
    async (entry: UploadEntry) => {
      updateEntry(entry.id, { status: 'uploading', progress: 0 })
      try {
        await filesApi.uploadWithProgress(
          entry.file,
          (pct) => updateEntry(entry.id, { progress: pct }),
          folderId
        )
        updateEntry(entry.id, { status: 'done', progress: 100 })
        queryClient.invalidateQueries({ queryKey: ['files'] })
        queryClient.invalidateQueries({ queryKey: ['me'] })
        toast.success(`"${entry.file.name}" uploadé`)
        onUploaded?.()
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          (err as Error)?.message ??
          "Erreur lors de l'upload"
        updateEntry(entry.id, { status: 'error', error: msg })
        toast.error(`${entry.file.name} : ${msg}`)
      }
    },
    [folderId, queryClient, updateEntry, onUploaded]
  )

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      rejected.forEach((r) => {
        const first = r.errors[0]
        const reason =
          first?.code === 'file-too-large'
            ? `${r.file.name} dépasse 100 Mo`
            : first?.message ?? 'Fichier refusé'
        toast.error(reason)
      })

      if (accepted.length === 0) return

      const entries: UploadEntry[] = accepted.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: 'pending',
      }))

      setQueue((q) => [...q, ...entries])
      // Launch outside the setter — safe under StrictMode (idempotent if duplicated, but
      // upload itself is keyed by id; we de-dup via the entry).
      entries.forEach((entry) => void uploadOne(entry))
    },
    [uploadOne]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
  })

  const doneCount = queue.filter((f) => f.status === 'done').length
  const clearDone = () => setQueue((q) => q.filter((f) => f.status !== 'done'))

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${isDragReject ? 'border-red-400 bg-red-50' :
            isDragActive ? 'border-blue-500 bg-blue-50' :
            'border-gray-200 hover:border-blue-300 hover:bg-gray-50'}`}
        role="button"
        tabIndex={0}
        aria-label="Zone d'upload de fichiers"
      >
        <input {...getInputProps()} aria-label="Sélectionner des fichiers" />
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors
              ${isDragActive ? 'bg-blue-100' : 'bg-gray-100'}`}
          >
            <Upload className={`w-6 h-6 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
          </div>
          {isDragActive ? (
            <p className="text-blue-600 font-medium">Déposez les fichiers ici</p>
          ) : (
            <>
              <p className="text-gray-700 font-medium">Glissez-déposez vos fichiers ici</p>
              <p className="text-gray-400 text-sm">ou cliquez pour parcourir</p>
              <p className="text-gray-400 text-xs">Max 100 Mo par fichier</p>
            </>
          )}
        </div>
      </div>

      {queue.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {doneCount}/{queue.length} fichiers
            </p>
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                className="text-xs text-gray-400 hover:text-gray-600"
                type="button"
              >
                Effacer les terminés
              </button>
            )}
          </div>

          {queue.map((entry) => (
            <div key={entry.id} className="card p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {entry.file.name}
                  </p>
                  <p className="text-xs text-gray-400">{formatBytes(entry.file.size)}</p>
                </div>

                {entry.status === 'done' && (
                  <Check className="w-5 h-5 text-green-500" aria-label="Terminé" />
                )}
                {entry.status === 'error' && (
                  <div className="flex items-center gap-2">
                    <FileWarning className="w-5 h-5 text-red-500" aria-label="Erreur" />
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      className="text-gray-400 hover:text-gray-600"
                      aria-label="Retirer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {entry.status === 'uploading' && (
                  <span className="text-blue-500 text-xs font-medium tabular-nums">
                    {entry.progress}%
                  </span>
                )}
              </div>

              {entry.status === 'uploading' && (
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${entry.progress}%` }}
                  />
                </div>
              )}

              {entry.status === 'error' && entry.error && (
                <p className="mt-1 text-xs text-red-500">{entry.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
