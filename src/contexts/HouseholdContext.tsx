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
  type Household,
} from '../lib/households'
import { useUser } from '../hooks/useUser'

interface HouseholdContextValue {
  households: Household[]
  /** Hogar activo, o null cuando se está en modo personal. */
  active: Household | null
  loading: boolean
  setActive: (householdId: string | null) => void
  refresh: () => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user } = useUser()
  const [households, setHouseholds] = useState<Household[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
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
      // Validar el hogar activo guardado: debe seguir existiendo.
      const stored = getActiveHouseholdId(user.id)
      const valid = stored && list.some((h) => h.id === stored) ? stored : null
      if (stored && !valid) setActiveHouseholdId(user.id, null)
      setActiveId(valid)
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

  const active = households.find((h) => h.id === activeId) ?? null

  return (
    <HouseholdContext.Provider value={{ households, active, loading, setActive, refresh }}>
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
