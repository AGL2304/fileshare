import { useState, useCallback } from 'react'
import { Modal } from './Modal'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void
}

let externalConfirm: ((opts: ConfirmOptions) => Promise<boolean>) | null = null

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  if (!externalConfirm) {
    // Fallback if provider not mounted (tests, etc.)
    return Promise.resolve(window.confirm(opts.message))
  }
  return externalConfirm(opts)
}

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null)

  const ask = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve })
    })
  }, [])

  externalConfirm = ask

  const close = (result: boolean) => {
    state?.resolve(result)
    setState(null)
  }

  return (
    <>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title}
        size="sm"
      >
        {state && (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">{state.message}</p>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => close(false)}
                className="btn-secondary"
                type="button"
              >
                {state.cancelLabel ?? 'Annuler'}
              </button>
              <button
                onClick={() => close(true)}
                className={state.variant === 'danger' ? 'btn-danger' : 'btn-primary'}
                type="button"
                autoFocus
              >
                {state.confirmLabel ?? 'Confirmer'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
