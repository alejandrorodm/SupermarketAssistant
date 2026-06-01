import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../lib/errors'
import {
  ChevronLeft,
  Scale,
  ArrowRight,
  Check,
  Loader2,
  Trash2,
  PartyPopper,
  Receipt,
} from 'lucide-react'
import { useHousehold } from '../contexts/HouseholdContext'
import { useToast } from '../contexts/ToastContext'
import { EmptyState } from '../components/ui/EmptyState'
import {
  getHouseholdBalance,
  getSettlements,
  addSettlement,
  deleteSettlement,
  type BalanceResult,
  type Settlement,
  type Debt,
} from '../lib/households'

const euro = (n: number) => `${n.toFixed(2)}€`

export function Balance() {
  const navigate = useNavigate()
  const { active } = useHousehold()
  const toast = useToast()

  const [balance, setBalance] = useState<BalanceResult | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!active) return
    setLoading(true)
    try {
      const [b, s] = await Promise.all([getHouseholdBalance(active.id), getSettlements(active.id)])
      setBalance(b)
      setSettlements(s)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cargar el balance.'))
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  useEffect(() => {
    // Carga del balance al montar / cambiar de hogar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const handleSettle = async (debt: Debt) => {
    if (!active) return
    setSettling(debt.from + debt.to)
    try {
      await addSettlement(active.id, debt.from, debt.to, debt.amount, 'Saldado desde balance')
      toast.success(`${debt.from_name} → ${debt.to_name}: ${euro(debt.amount)} registrado.`)
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo registrar el pago.'))
    } finally {
      setSettling(null)
    }
  }

  const handleDeleteSettlement = async (id: string) => {
    try {
      await deleteSettlement(id)
      toast.info('Pago eliminado.')
      await load()
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo eliminar.'))
    }
  }

  if (!active) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
        <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm px-4 py-3.5 flex items-center sticky top-0 z-10 pt-safe">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
          >
            <ChevronLeft size={26} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Balance</h1>
        </header>
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={Scale}
            title="Sin hogar activo"
            description="Activa un hogar para ver el balance compartido."
            action={
              <button
                onClick={() => navigate('/households')}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 active:scale-95 transition-all"
              >
                Ir a hogares
              </button>
            }
          />
        </div>
      </div>
    )
  }

  const members = balance ? Object.keys(balance.net) : []
  const allSettled = balance ? balance.debts.length === 0 : false

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm px-4 py-3.5 flex items-center sticky top-0 z-10 pt-safe">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
        >
          <ChevronLeft size={26} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Balance</h1>
          <p className="text-xs text-slate-400 -mt-0.5">{active.name}</p>
        </div>
      </header>

      <main className="p-5 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-5 text-white shadow-lg shadow-blue-600/20">
              <p className="text-sm text-blue-100">Gasto compartido total</p>
              <p className="text-3xl font-bold mt-1">{euro(balance?.totalCompartido ?? 0)}</p>
            </div>

            {/* Quién debe a quién */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Para saldar cuentas
              </h2>
              {allSettled ? (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 flex flex-col items-center text-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <PartyPopper size={24} />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-white">¡Todo en orden!</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nadie debe nada. Las cuentas están saldadas.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {balance?.debts.map((d) => (
                    <div
                      key={d.from + d.to}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3"
                    >
                      <div className="flex-1 flex items-center gap-2 min-w-0 text-sm">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {d.from_name}
                        </span>
                        <ArrowRight size={16} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {d.to_name}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0">
                        {euro(d.amount)}
                      </span>
                      <button
                        onClick={() => handleSettle(d)}
                        disabled={settling === d.from + d.to}
                        className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60 shrink-0"
                      >
                        {settling === d.from + d.to ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                        Saldar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Saldo por persona */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Saldo por persona
              </h2>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                {members.map((uid) => {
                  const v = balance!.net[uid]
                  const positive = v > 0.01
                  const negative = v < -0.01
                  return (
                    <div key={uid} className="flex items-center gap-3 p-4">
                      <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0 text-sm font-bold uppercase">
                        {(balance!.names[uid] || '?').charAt(0)}
                      </div>
                      <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {balance!.names[uid]}
                      </p>
                      <span
                        className={`text-sm font-bold ${
                          positive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : negative
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-slate-400'
                        }`}
                      >
                        {positive ? '+' : ''}
                        {euro(v)}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 px-1">
                En verde, lo que le deben; en rojo, lo que debe.
              </p>
            </section>

            {/* Historial de pagos */}
            {settlements.length > 0 && (
              <section>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                  Pagos registrados
                </h2>
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {settlements.map((s) => (
                    <div key={s.id} className="flex items-center gap-3 p-4">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Receipt size={16} />
                      </div>
                      <div className="flex-1 min-w-0 text-sm">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {s.from_name} <span className="text-slate-400">pagó a</span> {s.to_name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(s.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white shrink-0">
                        {euro(s.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteSettlement(s.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
                        aria-label="Eliminar pago"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}
