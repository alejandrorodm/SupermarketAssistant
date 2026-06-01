import { useEffect, useState } from 'react'
import { Sparkles, Loader2, RefreshCw, Lightbulb, Check, ShoppingBasket } from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { getProductosFrecuentes, categoryColors } from '../lib/stats'
import { generarListaCompraIA, type ListaCompraIA } from '../lib/gemini'
import { BottomNav } from '../components/BottomNav'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../contexts/ToastContext'

export function ShoppingList() {
  const { user } = useUser()
  const toast = useToast()
  const [lista, setLista] = useState<ListaCompraIA | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasHistory, setHasHistory] = useState<boolean | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!user) return
    getProductosFrecuentes(user.id, 1)
      .then((p) => setHasHistory(p.length > 0))
      .catch(() => setHasHistory(false))
  }, [user])

  const generar = async () => {
    if (!user) return
    setIsGenerating(true)
    setChecked(new Set())
    try {
      const productos = await getProductosFrecuentes(user.id)
      const result = await generarListaCompraIA(productos)
      setLista(result)
    } catch (err: any) {
      toast.error(err.message || 'No se pudo generar la lista.')
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

  const restante = lista
    ? lista.sugerencias
        .filter((_, i) => !checked.has(i))
        .reduce((acc, s) => acc + Number(s.precio_estimado || 0), 0)
    : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      <header className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 pt-12 pb-8 shadow-lg rounded-b-3xl text-white pt-safe">
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles size={22} />
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
          <div className="text-center pt-6 animate-fade-in">
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
        ) : (
          <div className="space-y-5 animate-fade-in">
            {/* Resumen */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <div>
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
                  className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3.5 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-60"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Regenerar
                </button>
              </div>
            </div>

            {/* Consejo */}
            {lista.consejo && (
              <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 flex gap-3">
                <Lightbulb size={20} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">{lista.consejo}</p>
              </div>
            )}

            {/* Lista */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-3 shadow-sm border border-slate-100 dark:border-slate-700">
              {lista.sugerencias.map((s, i) => {
                const isChecked = checked.has(i)
                return (
                  <button
                    key={i}
                    onClick={() => toggle(i)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors text-left"
                  >
                    <div
                      className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isChecked && <Check size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-semibold text-sm ${
                          isChecked
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {s.producto_nombre}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: categoryColors[s.categoria] || categoryColors['Otros'] }}
                        />
                        <span className="text-xs text-slate-400">{s.motivo}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 shrink-0">
                      {Number(s.precio_estimado).toFixed(2)}€
                    </span>
                  </button>
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
