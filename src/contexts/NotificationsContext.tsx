import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import {
  loadNotifications,
  getSeenState,
  setSeenState,
  countUnread,
  type AppNotification,
} from '../lib/notifications'
import { useUser } from '../hooks/useUser'
import { useHousehold } from './HouseholdContext'
import { useToast } from './ToastContext'

interface NotificationsContextValue {
  items: AppNotification[]
  unread: number
  loading: boolean
  refresh: () => Promise<void>
  markAllSeen: () => void
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const { households, active } = useHousehold()
  const toast = useToast()

  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  const userId = user?.id ?? null
  const activeId = active?.id ?? null
  const householdNames = useMemo(() => {
    const m: Record<string, string> = {}
    for (const h of households) m[h.id] = h.name
    return m
  }, [households])

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([])
      setUnread(0)
      return
    }
    setLoading(true)
    try {
      const seen = getSeenState(userId)
      const now = new Date().toISOString()
      const list = await loadNotifications({
        userId,
        activeHouseholdId: activeId,
        householdNames,
        now,
        sinceISO: seen.ts,
      })
      setItems(list)
      setUnread(countUnread(list, seen))
    } catch (err) {
      console.error('Error cargando notificaciones:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, activeId, householdNames])

  const markAllSeen = useCallback(() => {
    if (!userId) return
    const now = new Date().toISOString()
    setSeenState(userId, items, now)
    setUnread(0)
  }, [userId, items])

  // Carga inicial y al cambiar usuario / hogares / hogar activo.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  // Realtime: avisa cuando otro miembro del hogar inserta un ticket.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('household-tickets')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          const row = payload.new as { user_id?: string; household_id?: string | null }
          if (!row?.household_id || row.user_id === userId) return
          if (!householdNames[row.household_id]) return
          toast.info(`Nuevo ticket en «${householdNames[row.household_id]}»`)
          refresh()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, householdNames, refresh, toast])

  return (
    <NotificationsContext.Provider value={{ items, unread, loading, refresh, markAllSeen }}>
      {children}
    </NotificationsContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications debe usarse dentro de NotificationsProvider')
  return ctx
}
