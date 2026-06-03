import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Bell, Wallet, AlertTriangle, Users, RefreshCw, Loader2 } from 'lucide-react'
import { useNotifications } from '../contexts/NotificationsContext'
import { BottomNav } from '../components/BottomNav'
import { EmptyState } from '../components/ui/EmptyState'
import type { AppNotification } from '../lib/notifications'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return `hace ${d} d`
}

function NotificationRow({ n }: { n: AppNotification }) {
  const isOver = n.level === 'over'
  const { Icon, wrap } =
    n.kind === 'household'
      ? { Icon: Users, wrap: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' }
      : isOver
        ? { Icon: AlertTriangle, wrap: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' }
        : { Icon: Wallet, wrap: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' }

  return (
    <div className="flex items-start gap-3 p-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wrap}`}>
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.title}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{n.body}</p>
        {n.kind === 'household' && (
          <p className="text-xs text-slate-400 mt-1">{timeAgo(n.ts)}</p>
        )}
      </div>
    </div>
  )
}

export function Notifications() {
  const navigate = useNavigate()
  const { items, loading, refresh, markAllSeen } = useNotifications()

  // Al entrar, marcar como vistas (limpia el badge).
  useEffect(() => {
    markAllSeen()
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 pt-safe">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
            aria-label="Volver"
          >
            <ChevronLeft size={26} />
          </button>
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-slate-700 dark:text-slate-200" />
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Notificaciones</h1>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          aria-label="Actualizar"
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 disabled:opacity-50"
        >
          {loading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
        </button>
      </header>

      <main className="p-5 max-w-2xl mx-auto">
        {items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Sin notificaciones"
            description="Aquí verás los avisos de presupuesto y cuando alguien de tu hogar suba un ticket."
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700 animate-fade-in">
            {items.map((n) => (
              <NotificationRow key={n.id} n={n} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
