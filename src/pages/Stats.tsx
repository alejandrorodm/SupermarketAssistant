import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  PieChart as PieChartIcon,
  TrendingUp,
  Calendar,
  ShoppingCart,
  Receipt,
  Download,
  ChevronRight,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts'
import { BottomNav } from '../components/BottomNav'
import { supabase } from '../lib/supabase'
import { getFullStats, getMonthlyTrend, getExportData, type MonthlyPoint } from '../lib/stats'
import { downloadCSV } from '../lib/export'
import { Skeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../contexts/ToastContext'
import { useHousehold } from '../contexts/HouseholdContext'

export function Stats() {
  const navigate = useNavigate()
  const toast = useToast()
  const { active } = useHousehold()
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [trend, setTrend] = useState<MonthlyPoint[]>([])
  const [data, setData] = useState<{
    historial: any[]
    gastoTotal: number
    gastoPorSupermercado: any[]
    gastoPorCategoria: any[]
  } | null>(null)

  const householdId = active?.id ?? null

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true)
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData?.session?.user
        if (user) {
          setUserId(user.id)
          const [stats, t] = await Promise.all([
            getFullStats(user.id, householdId),
            getMonthlyTrend(user.id, 6, householdId),
          ])
          setData(stats)
          setTrend(t)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [householdId])

  const handleExport = async () => {
    if (!userId) return
    setIsExporting(true)
    try {
      const rows = await getExportData(userId)
      if (rows.length === 0) {
        toast.info('No hay datos para exportar.')
        return
      }
      downloadCSV(`ticketsaver-${new Date().toISOString().slice(0, 10)}.csv`, rows)
      toast.success(`Exportadas ${rows.length} líneas a CSV.`)
    } catch (err: any) {
      toast.error(err.message || 'No se pudo exportar.')
    } finally {
      setIsExporting(false)
    }
  }

  const maxTrend = Math.max(...trend.map((t) => t.total), 0)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      <header className="bg-white dark:bg-slate-800 px-5 pt-12 pb-6 shadow-sm rounded-b-3xl pt-safe flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieChartIcon size={24} className="text-blue-600" />
            Estadísticas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Resumen global de tus gastos</p>
        </div>
        {data && data.historial.length > 0 && (
          <button
            onClick={handleExport}
            disabled={isExporting}
            aria-label="Exportar CSV"
            className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-60"
          >
            {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          </button>
        )}
      </header>

      <main className="p-5 space-y-5 max-w-3xl mx-auto">
        {isLoading ? (
          <div className="space-y-5">
            <Skeleton className="h-28" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : !data || data.historial.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Aún no hay datos"
            description="Escanea algunos tickets para generar estadísticas."
          />
        ) : (
          <>
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-600/30 animate-fade-in-up">
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <TrendingUp size={18} />
                <span className="font-medium">Gasto histórico total</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold tracking-tight">{data.gastoTotal.toFixed(2)}</span>
                <span className="text-xl font-medium text-indigo-200 pb-1">€</span>
              </div>
            </div>

            {/* Tendencia mensual */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up">
              <h3 className="font-bold text-slate-900 dark:text-white mb-1">Evolución del gasto</h3>
              <p className="text-xs text-slate-400 mb-5">Últimos 6 meses</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      width={45}
                      domain={[0, Math.ceil((maxTrend * 1.2) / 10) * 10 || 10]}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)} €`, 'Gasto']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#trendFill)"
                      dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Por supermercado */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6">Gasto por supermercado</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.gastoPorSupermercado} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                    />
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)} €`, 'Gastado']}
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                      {data.gastoPorSupermercado.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Por categoría */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6">Gasto por categoría</h3>
              {data.gastoPorCategoria && data.gastoPorCategoria.length > 0 ? (
                <>
                  <div className="h-48 w-full mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.gastoPorCategoria}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {data.gastoPorCategoria.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${Number(value).toFixed(2)} €`, 'Gastado']}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {data.gastoPorCategoria.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{cat.name}</span>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{cat.value.toFixed(2)} €</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No hay datos de categorías.</p>
              )}
            </div>

            {/* Acceso al historial completo */}
            <button
              onClick={() => navigate('/history')}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between hover:border-blue-500 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <ShoppingCart size={18} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900 dark:text-white">Historial completo</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar size={12} /> {data.historial.length} tickets
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-300 dark:text-slate-600" />
            </button>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
