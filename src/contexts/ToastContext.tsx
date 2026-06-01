import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

let nextId = 1

const config: Record<ToastType, { icon: typeof Info; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'ring-emerald-500/20', iconColor: 'text-emerald-500' },
  error: { icon: AlertCircle, ring: 'ring-red-500/20', iconColor: 'text-red-500' },
  info: { icon: Info, ring: 'ring-blue-500/20', iconColor: 'text-blue-500' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = nextId++
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => remove(id), 4000)
    },
    [remove],
  )

  const value: ToastContextValue = {
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    info: (m) => toast(m, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-0 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pt-safe pointer-events-none">
        <div className="pt-3 w-full max-w-sm flex flex-col gap-2">
          {toasts.map((t) => {
            const { icon: Icon, ring, iconColor } = config[t.type]
            return (
              <div
                key={t.id}
                className={`pointer-events-auto flex items-center gap-3 w-full bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-xl shadow-slate-900/10 ring-1 ${ring} animate-fade-in-up`}
              >
                <Icon className={`shrink-0 ${iconColor}`} size={20} />
                <p className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{t.message}</p>
                <button
                  onClick={() => remove(t.id)}
                  className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider')
  return ctx
}
