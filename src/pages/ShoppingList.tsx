import { useEffect, useState } from 'react'
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Lightbulb,
  Check,
  ShoppingBasket,
  Wand2,
  Shuffle,
  ChevronDown,
} from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { getProductosFrecuentes, getSupermercados, categoryColors } from '../lib/stats'
import { getInventory } from '../lib/inventory'
import { getErrorMessage } from '../lib/errors'
import {
  generarListaCompraIA,
  sugerirAlternativasProducto,
  type ListaCompraIA,
  type AlternativaProducto,
} from '../lib/gemini'
import { BottomNav } from '../components/BottomNav'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../contexts/ToastContext'
import { useHousehold } from '../contexts/HouseholdContext'

const RULES_PREFIX = 'ts-list-rules:'

export function ShoppingList() {
  const { user } = useUser()
  const { active } = useHousehold()
  const toast = useToast()
  const [lista, setLista] = useState<ListaCompraIA | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasHistory, setHasHistory] = useState<boolean | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  // Personalización
  const [reglas, setReglas] = useState('')
  const [showRules, setShowRules] = useState(false)

  // Alternativas por producto
  const [altOpen, setAltOpen] = useState<number | null>(null)
  const [altData, setAltData] = useState<Record<number, AlternativaProducto[]>>({})
  const [altLoading, setAltLoading] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!user) return
    getProductosFrecuentes(user.id, 1)
      .then((p) => setHasHistory(p.length > 0))
      .catch(() => setHasHistory(false))
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReglas(localStorage.getItem(RULES_PREFIX + user.id) || '')
    } catch {
      /* ignore */
    }
  }, [user])

  const guardarReglas = (texto: string) => {
    setReglas(texto)
    if (!user) return
    try {
      if (texto.trim()) localStorage.setItem(RULES_PREFIX + user.id, texto)
      else localStorage.removeItem(RULES_PREFIX + user.id)
    } catch {
      /* ignore */
    }
  }

  const generar = async () => {
    if (!user) return
    setIsGenerating(true)
    setChecked(new Set())
    setAltData({})
    setAltOpen(null)
    try {
      const [productos, inventario, supermercados] = await Promise.all([
        getProductosFrecuentes(user.id),
        getInventory({ userId: user.id, householdId: active?.id ?? null }).catch(() => []),
        getSupermercados(user.id, active?.id ?? null).catch(() => []),
      ])
      const disponible = inventario.map((i) => ({
        producto_nombre: i.producto_nombre,
        cantidad: i.cantidad,
      }))
      const result = await generarListaCompraIA(productos, disponible, {
        reglas,
        supermercados,
      })
      setLista(result)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo generar la lista.'))
    } finally {
      setIsGenerating(false)
    }
  }

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const abrirAlternativas = async (i: number) => {
    if (altOpen === i) {
      setAltOpen(null)
      return
    }
    setAltOpen(i)
    if (altData[i] || !lista) return
    const s = lista.sugerencias[i]
    setAltLoading((prev) => new Set(prev).add(i))
    try {
      const alts = await sugerirAlternativasProducto(s.producto_nombre, s.categoria)
      setAltData((prev) => ({ ...prev, [i]: alts }))
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudieron obtener alternativas.'))
      setAltOpen(null)
    } finally {
      setAltLoading((prev) => {
        const next = new Set(prev)
        next.delete(i)
        return next
      })
    }
  }

  const sustituir = (i: number, alt: AlternativaProducto) => {
    setLista((prev) => {
      if (!prev) return prev
      const sugerencias = prev.sugerencias.map((s, idx) =>
        idx === i
          ? {
              ...s,
              producto_nombre: alt.producto_nombre,
              precio_estimado: alt.precio_estimado || s.precio_estimado,
              motivo: 'Alternativa elegida',
            }
          : s,
      )
      return { ...prev, sugerencias }
    })
    setAltOpen(null)
    toast.success(`Cambiado por ${alt.producto_nombre}`)
  }

  const restante = lista
    ? lista.sugerencias
        .filter((_, i) => !checked.has(i))
        .reduce((acc, s) => acc + Number(s.precio_estimado || 0), 0)
    : 0

  // Panel de reglas reutilizable
  const rulesPanel = (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setShowRules((v) => !v)}
        className="w-full flex items-center gap-2.5 p-4 text-left"
      >
        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
          <Wand2 size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">Personalizar lista</p>
          <p className="text-xs text-slate-400 truncate">
            {reglas.trim() ? reglas.trim() : 'Reglas opcionales para la IA'}
          </p>
        </div>
        <ChevronDown
          size={18}
          className={`text-slate-400 shrink-0 transition-transform ${showRules ? 'rotate-180' : ''}`}
        />
      </button>
      {showRules && (
        <div className="px-4 pb-4 animate-fade-in">
          <textarea
            value={reglas}
            onChange={(e) => guardarReglas(e.target.value)}
            rows={3}
            placeholder={'Ej: solo de Mercadona · carne ya tengo · nada de gluten · presupuesto 40€'}
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 dark:text-white px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[11px] text-slate-400 mt-1.5 leading-snug">
            Escribe tus preferencias en lenguaje natural; la IA las respeta al generar la lista.
            Se guardan para la próxima vez.
          </p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      <header className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 pt-12 pb-8 shadow-lg rounded-b-3xl text-white pt-safe">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={22} className="shrink-0" />
          <h1 className="text-2xl font-bold">Lista inteligente</h1>
        </div>
        <p className="text-indigo-100 text-sm">
          La IA analiza tu historial y te sugiere qué comprar, estimando el gasto.
        </p>
      </header>

      <main className="p-5 max-w-2xl mx-auto space-y-5">
        {hasHistory === false && !lista ? (
          <EmptyState
            icon={ShoppingBasket}
            title="Necesitas algo de historial"
            description="Escanea unos cuantos tickets y la IA aprenderá tus hábitos para sugerirte la compra."
          />
        ) : !lista ? (
          <div className="space-y-5 animate-fade-in">
            {rulesPanel}
            <div className="text-center pt-2">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-5">
                <Sparkles size={36} />
              </div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Genera tu lista de la compra</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto mb-6">
                Basada en lo que sueles comprar, con una estimación del gasto total.
              </p>
              <button
                onClick={generar}
                disabled={isGenerating || hasHistory === null}
                className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-semibold shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={20} className="animate-spin" /> Analizando tu historial...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} /> Generar lista
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Resumen */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Gasto estimado</p>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {restante.toFixed(2)} <span className="text-lg text-slate-400">€</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {checked.size > 0 ? `${checked.size} ya en la cesta` : `${lista.sugerencias.length} productos sugeridos`}
                  </p>
                </div>
                <button
                  onClick={generar}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3.5 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-60 shrink-0"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Regenerar
                </button>
              </div>
            </div>

            {rulesPanel}

            {/* Consejo */}
            {lista.consejo && (
              <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex gap-3">
                <Lightbulb size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200 min-w-0 break-words">{lista.consejo}</p>
              </div>
            )}

            {/* Lista */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-3 shadow-sm border border-slate-100 dark:border-slate-700">
              {lista.sugerencias.map((s, i) => {
                const isChecked = checked.has(i)
                const isAltOpen = altOpen === i
                const isAltLoading = altLoading.has(i)
                return (
                  <div key={i}>
                    <div className="flex items-center gap-2.5 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                      <button
                        onClick={() => toggle(i)}
                        aria-label="Marcar como en la cesta"
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isChecked && <Check size={15} />}
                      </button>
                      <button onClick={() => toggle(i)} className="flex-1 min-w-0 text-left">
                        <p
                          className={`font-semibold text-sm break-words ${
                            isChecked ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {s.producto_nombre}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: categoryColors[s.categoria] || categoryColors['Otros'] }}
                          />
                          <span className="text-xs text-slate-400 truncate">{s.motivo}</span>
                        </div>
                      </button>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">
                        {Number(s.precio_estimado).toFixed(2)}€
                      </span>
                      <button
                        onClick={() => abrirAlternativas(i)}
                        aria-label="Ver alternativas"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isAltOpen
                            ? 'bg-indigo-600 text-white'
                            : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                        }`}
                      >
                        {isAltLoading ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
                      </button>
                    </div>

                    {/* Alternativas */}
                    {isAltOpen && (
                      <div className="px-3 pb-3 pt-1 animate-fade-in">
                        {isAltLoading ? (
                          <p className="text-xs text-slate-400 pl-9">Buscando alternativas…</p>
                        ) : (altData[i] || []).length === 0 ? (
                          <p className="text-xs text-slate-400 pl-9">Sin alternativas.</p>
                        ) : (
                          <div className="pl-9 flex flex-wrap gap-2">
                            {(altData[i] || []).map((alt, k) => (
                              <button
                                key={k}
                                onClick={() => sustituir(i, alt)}
                                className="inline-flex items-center gap-1.5 max-w-full bg-slate-100 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 rounded-full pl-3 pr-2.5 py-1.5 text-xs font-medium transition-colors"
                              >
                                <span className="truncate">{alt.producto_nombre}</span>
                                <span className="text-slate-400 shrink-0">{Number(alt.precio_estimado).toFixed(2)}€</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-center text-xs text-slate-400">
              Estimaciones generadas por IA a partir de tus precios históricos. Pueden variar.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
