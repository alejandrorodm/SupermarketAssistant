import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings as SettingsIcon,
  ScanLine,
  ShoppingCart,
  TrendingUp,
  ChevronRight,
  Receipt,
  Wallet,
  Sparkles,
  Users,
  Home,
} from 'lucide-react'
import { TrendingUp as TrendingUpIcon, ArrowUpRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { supabase } from '../lib/supabase'
import { getDashboardStats, getPriceAlerts } from '../lib/stats'
import type { CategoryData, PriceAlert, TicketSummary } from '../lib/stats'
import { getBudget } from '../lib/budget'
import { useHousehold } from '../contexts/HouseholdContext'
import { BottomNav } from '../components/BottomNav'
import { ThemeToggle } from '../components/ThemeToggle'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'

interface DashboardData {
  totalGastado: number
  ticketsRecientes: TicketSummary[]
  categorias: CategoryData[]
  numTickets: number
  ticketMedio: number
}

export function Dashboard() {
  const navigate = useNavigate()
  const { active } = useHousehold()
  const [data, setData] = useState<DashboardData | null>(null)
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')
  const [budget, setBudgetState] = useState<number | null>(null)

  const householdId = active?.id ?? null

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData?.session?.user
        if (user) {
          setUserName(user.email?.split('@')[0] || 'Usuario')
          setBudgetState(getBudget(user.id))
          const [stats, al] = await Promise.all([
            getDashboardStats(user.id, householdId),
            getPriceAlerts(user.id, householdId),
          ])
          setData(stats as DashboardData)
          setAlerts(al)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [householdId])

  const currentMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date())
  const gastado = data?.totalGastado ?? 0
  const pct = budget && budget > 0 ? Math.min((gastado / budget) * 100, 100) : 0
  const overBudget = budget != null && gastado > budget
  const nearBudget = budget != null && !overBudget && pct >= 80

  const barColor = overBudget ? 'bg-red-500' : nearBudget ? 'bg-amber-400' : 'bg-white'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      <header className="bg-white dark:bg-slate-800 px-5 pt-12 pb-6 shadow-sm flex justify-between items-center rounded-b-3xl pt-safe">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Hola de nuevo,</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{userName || '—'}</h1>
          <button
            onClick={() => navigate('/households')}
            className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
              active
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {active ? <Users size={13} /> : <Home size={13} />}
            {active ? active.name : 'Personal'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => navigate('/settings')}
            aria-label="Ajustes"
            className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </header>

      <main className="p-5 space-y-5 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-20 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        ) : (
          <>
            {/* Tarjeta de gasto + presupuesto */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/30 animate-fade-in-up">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-100">
                  <TrendingUp size={18} />
                  <span className="font-medium capitalize">Gasto en {currentMonth}</span>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="text-blue-100 hover:text-white text-xs font-semibold flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Wallet size={13} />
                  {budget ? `${budget.toFixed(0)}€/mes` : 'Presupuesto'}
                </button>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold tracking-tight">{gastado.toFixed(2)}</span>
                <span className="text-xl font-medium text-blue-200 pb-1">€</span>
              </div>

              {budget ? (
                <div className="mt-4">
                  <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-sm mt-2 text-blue-100">
                    {overBudget ? (
                      <span className="text-red-200 font-semibold">
                        Has superado el presupuesto en {(gastado - budget).toFixed(2)}€
                      </span>
                    ) : (
                      <>
                        Te quedan <span className="font-semibold text-white">{(budget - gastado).toFixed(2)}€</span> este mes
                        {nearBudget && <span className="text-amber-200"> · ¡cuidado!</span>}
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-blue-100 mt-3">
                  Define un presupuesto mensual para controlar tu gasto.
                </p>
              )}
            </div>

            {/* Mini-stats */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Receipt size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Tickets</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{data?.numTickets ?? 0}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <ShoppingCart size={16} />
                  <span className="text-xs font-semibold uppercase tracking-wide">Ticket medio</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {(data?.ticketMedio ?? 0).toFixed(2)}€
                </p>
              </div>
            </div>

            {/* Accesos rápidos */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/scan')}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col gap-2 group hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm active:scale-95"
              >
                <div className="w-11 h-11 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ScanLine size={22} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Escanear ticket</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Nueva compra</p>
                </div>
              </button>
              <button
                onClick={() => navigate('/list')}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 flex flex-col gap-2 group hover:border-indigo-500 dark:hover:border-indigo-500 transition-all shadow-sm active:scale-95"
              >
                <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles size={22} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Lista IA</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Sugerencias</p>
                </div>
              </button>
            </div>

            {/* Gráfico de categorías */}
            {data && data.categorias.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Desglose por categoría</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categorias}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.categorias.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value) => [`${Number(value).toFixed(2)} €`, 'Gastado']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-y-3 mt-4">
                  {data.categorias.map((cat, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{cat.name}</span>
                      <span className="text-slate-900 dark:text-white font-bold ml-auto">{cat.value.toFixed(0)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alertas de subida de precio */}
            {alerts.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-amber-200 dark:border-amber-900/40 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <TrendingUpIcon size={17} />
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Han subido de precio</h3>
                </div>
                <div className="space-y-2.5">
                  {alerts.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate capitalize">
                          {a.producto_nombre}
                        </p>
                        <p className="text-xs text-slate-400">
                          {a.precioAntes.toFixed(2)}€ → {a.precioAhora.toFixed(2)}€ · {a.supermercadoAhora}
                        </p>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-lg">
                        <ArrowUpRight size={13} />
                        {a.variacionPct}%
                      </span>
                    </div>
                  ))}
                </div>
                {alerts.length > 3 && (
                  <p className="text-xs text-slate-400 mt-3">
                    Y {alerts.length - 3} producto{alerts.length - 3 > 1 ? 's' : ''} más con subidas.
                  </p>
                )}
              </div>
            )}

            {/* Compras recientes */}
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Últimas compras</h3>
                <button
                  onClick={() => navigate('/history')}
                  className="text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline"
                >
                  Ver todo
                </button>
              </div>

              {data?.ticketsRecientes.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Aún no hay compras este mes"
                  description="Escanea tu primer ticket para empezar a controlar tus gastos."
                  action={
                    <button
                      onClick={() => navigate('/scan')}
                      className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-500 transition-colors flex items-center gap-2"
                    >
                      <ScanLine size={18} /> Escanear ahora
                    </button>
                  }
                />
              ) : (
                <div className="space-y-3 stagger">
                  {data?.ticketsRecientes.map((ticket, i) => (
                    <button
                      key={i}
                      onClick={() => navigate(`/ticket/${ticket.id}`)}
                      className="w-full text-left bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <ShoppingCart size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{ticket.supermercado}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(ticket.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
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
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
