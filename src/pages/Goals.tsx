import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Check,
  Lock,
  Target,
  Flame,
  PiggyBank,
  Footprints,
  Receipt,
  Award,
  Map as MapIcon,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useToast } from '../contexts/ToastContext'
import { getBudget } from '../lib/budget'
import { getDashboardStats, getFullStats, getMonthlyTrend } from '../lib/stats'
import {
  getSavingsGoal,
  setSavingsGoal,
  computeStreak,
  computeAchievements,
  type Achievement,
} from '../lib/goals'
import { Skeleton } from '../components/ui/Skeleton'

const iconMap: Record<string, LucideIcon> = {
  Footprints,
  Receipt,
  Award,
  Map: MapIcon,
  PiggyBank,
  Flame,
  Target,
}

export function Goals() {
  const navigate = useNavigate()
  const { user } = useUser()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [goalInput, setGoalInput] = useState('')
  const [goal, setGoal] = useState<number | null>(null)
  const [budget, setBudget] = useState<number | null>(null)
  const [gastoMes, setGastoMes] = useState(0)
  const [streak, setStreak] = useState(0)
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const b = getBudget(user.id)
        const g = getSavingsGoal(user.id)
        const [dash, full, trend] = await Promise.all([
          getDashboardStats(user.id),
          getFullStats(user.id),
          getMonthlyTrend(user.id, 12),
        ])
        if (cancelled) return
        const gasto = dash.totalGastado
        const st = computeStreak(trend, b)
        const ahorro = b ? Math.max(0, b - gasto) : 0
        setBudget(b)
        setGoal(g)
        setGoalInput(g ? String(g) : '')
        setGastoMes(gasto)
        setStreak(st)
        setAchievements(
          computeAchievements({
            numTickets: full.historial.length,
            numSupermercados: full.gastoPorSupermercado.length,
            budget: b,
            gastoMesActual: gasto,
            streak: st,
            savingsGoal: g,
            ahorroMesActual: ahorro,
          }),
        )
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const handleSaveGoal = () => {
    if (!user) return
    const value = parseFloat(goalInput)
    if (goalInput.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setSavingsGoal(user.id, null)
      setGoal(null)
      toast.info('Meta de ahorro eliminada.')
      return
    }
    setSavingsGoal(user.id, value)
    setGoal(value)
    toast.success('Meta de ahorro guardada.')
  }

  const ahorro = budget ? Math.max(0, budget - gastoMes) : 0
  const goalPct = goal && goal > 0 ? Math.min((ahorro / goal) * 100, 100) : 0
  const unlockedCount = achievements.filter((a) => a.unlocked).length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm px-4 py-3.5 flex items-center sticky top-0 z-10 pt-safe">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
        >
          <ChevronLeft size={26} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Metas y logros</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        ) : (
          <>
            {/* Meta de ahorro */}
            <section>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-600/20">
                <div className="flex items-center gap-2 text-emerald-50 mb-1">
                  <Target size={18} />
                  <span className="font-medium">Meta de ahorro de este mes</span>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{ahorro.toFixed(2)}</span>
                  <span className="text-xl font-medium text-emerald-100 pb-1">
                    €{goal ? ` / ${goal.toFixed(0)}€` : ''}
                  </span>
                </div>
                {goal ? (
                  <div className="mt-4">
                    <div className="h-2.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-700"
                        style={{ width: `${goalPct}%` }}
                      />
                    </div>
                    <p className="text-sm mt-2 text-emerald-50">
                      {ahorro >= goal ? (
                        <span className="font-semibold">¡Meta alcanzada! 🎉</span>
                      ) : (
                        <>
                          Te faltan{' '}
                          <span className="font-semibold text-white">{(goal - ahorro).toFixed(2)}€</span> para tu meta
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-emerald-50 mt-3">
                    {budget
                      ? 'Define cuánto quieres ahorrar y te ayudo a seguirlo.'
                      : 'Define un presupuesto en Ajustes para calcular tu ahorro.'}
                  </p>
                )}
              </div>

              {/* Editar meta */}
              <div className="mt-3 flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="10"
                    inputMode="decimal"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="Meta de ahorro (€)"
                    className="w-full rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white pl-4 pr-9 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
                </div>
                <button
                  onClick={handleSaveGoal}
                  className="px-5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2"
                >
                  <Check size={18} /> Guardar
                </button>
              </div>
            </section>

            {/* Racha */}
            <section>
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    streak > 0
                      ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-500'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                  }`}
                >
                  <Flame size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {streak > 0
                      ? `${streak} ${streak === 1 ? 'mes' : 'meses'} en verde`
                      : 'Sin racha activa'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {budget
                      ? 'Meses seguidos dentro del presupuesto'
                      : 'Define un presupuesto para empezar tu racha'}
                  </p>
                </div>
              </div>
            </section>

            {/* Logros */}
            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Logros</h2>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Trophy size={13} className="text-amber-500" />
                  {unlockedCount}/{achievements.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {achievements.map((a) => {
                  const Icon = iconMap[a.icon] ?? Award
                  return (
                    <div
                      key={a.id}
                      className={`rounded-2xl p-4 border transition-colors ${
                        a.unlocked
                          ? 'bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/40'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/60'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                          a.unlocked
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-500'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                        }`}
                      >
                        {a.unlocked ? <Icon size={20} /> : <Lock size={18} />}
                      </div>
                      <p
                        className={`text-sm font-bold ${
                          a.unlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {a.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                        {!a.unlocked && a.hint ? a.hint : a.description}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
