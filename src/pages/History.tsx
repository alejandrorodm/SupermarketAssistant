import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ShoppingCart, Calendar, Search, ChevronRight, Receipt } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getFullStats, type TicketSummary } from '../lib/stats'
import { useHousehold } from '../contexts/HouseholdContext'
import { BottomNav } from '../components/BottomNav'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'

export function History() {
  const navigate = useNavigate()
  const { active } = useHousehold()
  const [historial, setHistorial] = useState<TicketSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')

  const householdId = active?.id ?? null

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user) {
          const stats = await getFullStats(sessionData.session.user.id, householdId)
          setHistorial(stats.historial)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [householdId])

  const filtrados = useMemo(() => {
    if (!query.trim()) return historial
    const q = query.toLowerCase()
    return historial.filter((t) => (t.supermercado || '').toLowerCase().includes(q))
  }, [historial, query])

  // Agrupar por mes
  const grupos = useMemo(() => {
    const map: Record<string, { label: string; total: number; tickets: TicketSummary[] }> = {}
    filtrados.forEach((t) => {
      const d = new Date(t.fecha)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) {
        map[key] = {
          label: new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(d),
          total: 0,
          tickets: [],
        }
      }
      map[key].total += Number(t.total)
      map[key].tickets.push(t)
    })
    return Object.entries(map)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([, v]) => v)
  }, [filtrados])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      <header className="bg-white dark:bg-slate-800 px-5 pt-12 pb-5 shadow-sm rounded-b-3xl pt-safe">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
          >
            <ChevronLeft size={26} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Historial</h1>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por supermercado..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </header>

      <main className="p-5 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : grupos.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={query ? 'Sin resultados' : 'No hay tickets todavía'}
            description={
              query ? `No se encontraron compras en "${query}".` : 'Escanea tu primer ticket para verlo aquí.'
            }
          />
        ) : (
          <div className="space-y-6">
            {grupos.map((grupo, gi) => (
              <div key={gi}>
                <div className="flex justify-between items-baseline mb-3 px-1">
                  <h2 className="font-bold text-slate-700 dark:text-slate-200 capitalize">{grupo.label}</h2>
                  <span className="text-sm font-semibold text-slate-400">{grupo.total.toFixed(2)} €</span>
                </div>
                <div className="space-y-3 stagger">
                  {grupo.tickets.map((ticket, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/ticket/${ticket.id}`)}
                      className="w-full text-left bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <ShoppingCart size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{ticket.supermercado}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} />
                            {new Date(ticket.fecha).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-slate-900 dark:text-white">{Number(ticket.total).toFixed(2)} €</p>
                        <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
