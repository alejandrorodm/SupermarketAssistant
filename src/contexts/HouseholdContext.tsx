import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  getMyHouseholds,
  getActiveHouseholdId,
  setActiveHouseholdId,
  getDefaultHousehold,
  setDefaultHousehold,
  type Household,
} from '../lib/households'
import { useUser } from '../hooks/useUser'

interface HouseholdContextValue {
  households: Household[]
  /** Hogar activo, o null cuando se está en modo personal. */
  active: Household | null
  loading: boolean
  setActive: (householdId: string | null) => void
  /**
   * Preferencia de pantalla de inicio: 'personal' | <householdId> | null.
   * Determina qué se abre al entrar en la app.
   */
  homeId: string | null
  /** Fija la pantalla de inicio (null = personal) y conmuta a ella. */
  setHome: (householdId: string | null) => void
  refresh: () => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const [households, setHouseholds] = useState<Household[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [homeId, setHomeId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setHouseholds([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const list = await getMyHouseholds()
      setHouseholds(list)

      // Preferencia de inicio: 'personal' | <householdId> | null (sin fijar)
      const storedHome = getDefaultHousehold(user.id)
      let home: string | null = null
      if (storedHome === 'personal') {
        home = 'personal'
      } else if (storedHome && list.some((h) => h.id === storedHome)) {
        home = storedHome
      } else if (storedHome) {
        // El hogar de inicio ya no existe: limpiar la preferencia.
        setDefaultHousehold(user.id, null)
      }
      setHomeId(home)

      // Hogar activo al cargar: la pantalla de inicio fijada tiene prioridad;
      // si no hay ninguna, se respeta el último hogar usado (compatibilidad).
      let initial: string | null
      if (home === 'personal') {
        initial = null
      } else if (home) {
        initial = home
      } else {
        const stored = getActiveHouseholdId(user.id)
        initial = stored && list.some((h) => h.id === stored) ? stored : null
        if (stored && !initial) setActiveHouseholdId(user.id, null)
      }
      setActiveId(initial)
    } catch (err) {
      console.error('Error cargando hogares:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    // Carga inicial de hogares al montar / cambiar de usuario.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
  }, [refresh])

  const setActive = useCallback(
    (householdId: string | null) => {
      if (!user) return
      setActiveHouseholdId(user.id, householdId)
      setActiveId(householdId)
    },
    [user],
  )

  const setHome = useCallback(
    (householdId: string | null) => {
      if (!user) return
      const value = householdId ?? 'personal'
      setDefaultHousehold(user.id, value)
      setHomeId(value)
      // También conmutamos a ella para que el cambio sea inmediato.
      setActiveHouseholdId(user.id, householdId)
      setActiveId(householdId)
    },
    [user],
  )

  const active = households.find((h) => h.id === activeId) ?? null

  return (
    <HouseholdContext.Provider
      value={{ households, active, loading, setActive, homeId, setHome, refresh }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold debe usarse dentro de HouseholdProvider')
  return ctx
}
