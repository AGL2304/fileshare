import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught', error, info)
  }

  reset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-900">
          <div className="card p-8 max-w-md text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-500" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-gray-100">
                Quelque chose s'est mal passé
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Une erreur inattendue est survenue. Rechargez la page.
              </p>
            </div>
            {this.state.error && (
              <pre className="text-xs text-left bg-gray-100 dark:bg-slate-800 p-2 rounded overflow-x-auto">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.reset()
                window.location.reload()
              }}
              className="btn-primary mx-auto"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Recharger
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
