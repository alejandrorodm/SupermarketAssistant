import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Package, Plus, Minus, Trash2, Loader2, Users, Home } from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useHousehold } from '../contexts/HouseholdContext'
import { useToast } from '../contexts/ToastContext'
import { getErrorMessage } from '../lib/errors'
import {
  getInventory,
  addManualItem,
  setInventoryQuantity,
  removeInventoryItem,
  type InventoryItem,
} from '../lib/inventory'
import { categoryColors } from '../lib/stats'
import { CATEGORIAS } from '../lib/gemini'
import { BottomNav } from '../components/BottomNav'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'

export function Inventory() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { active } = useHousehold()
  const toast = useToast()

  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevo, setNuevo] = useState('')
  const [categoria, setCategoria] = useState<string>(CATEGORIAS[0])
  const [adding, setAdding] = useState(false)
  // Ids con una operación en curso (para deshabilitar sus botones).
  const [busy, setBusy] = useState<Set<string>>(new Set())

  const householdId = active?.id ?? null

  const cargar = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const data = await getInventory({ userId: user.id, householdId })
      setItems(data)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cargar el inventario.'))
    } finally {
      setLoading(false)
    }
  }, [user, householdId, toast])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar()
  }, [cargar])

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusy((prev) => new Set(prev).add(id))
    try {
      await fn()
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo actualizar la despensa.'))
    } finally {
      setBusy((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleAdd = async () => {
    if (!user || !nuevo.trim()) return
    setAdding(true)
    try {
      await addManualItem(nuevo, categoria, { userId: user.id, householdId })
      setNuevo('')
      await cargar()
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo añadir el producto.'))
    } finally {
      setAdding(false)
    }
  }

  const cambiarCantidad = (item: InventoryItem, delta: number) =>
    withBusy(item.id, async () => {
      const nueva = Number(item.cantidad) + delta
      await setInventoryQuantity(item.id, nueva)
      if (nueva <= 0) {
        setItems((prev) => prev.filter((i) => i.id !== item.id))
      } else {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, cantidad: nueva } : i)))
      }
    })

  const eliminar = (item: InventoryItem) =>
    withBusy(item.id, async () => {
      await removeInventoryItem(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    })

  // Agrupar por categoría, respetando el orden de CATEGORIAS.
  const grupos = useMemo(() => {
    const map: Record<string, InventoryItem[]> = {}
    for (const it of items) {
      const cat = it.categoria || 'Otros'
      ;(map[cat] ||= []).push(it)
    }
    const orden = [...CATEGORIAS] as string[]
    return Object.keys(map)
      .sort((a, b) => {
        const ia = orden.indexOf(a)
        const ib = orden.indexOf(b)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
      })
      .map((cat) => ({ cat, items: map[cat] }))
  }, [items])

  const totalUnidades = items.reduce((acc, i) => acc + Number(i.cantidad), 0)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-28">
      <header className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 pt-12 pb-7 shadow-lg rounded-b-3xl text-white pt-safe">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white -ml-1 p-1"
            aria-label="Volver"
          >
            <ChevronLeft size={26} />
          </button>
          <div className="flex items-center gap-2">
            <Package size={22} />
            <h1 className="text-2xl font-bold">Despensa</h1>
          </div>
        </div>
        <p className="text-emerald-100 text-sm mt-1.5 ml-1">
          Se llena sola con cada compra. Quita lo que vayas gastando.
        </p>
        <div className="mt-3 ml-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/15">
            {active ? <Users size={13} /> : <Home size={13} />}
            {active ? active.name : 'Personal'}
          </span>
          {!loading && (
            <span className="text-xs text-emerald-100">
              {items.length} productos · {totalUnidades} unidades
            </span>
          )}
        </div>
      </header>

      <main className="p-5 max-w-2xl mx-auto space-y-5">
        {/* Añadir a mano */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-2">
          <input
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Añadir producto a mano…"
            className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={adding || !nuevo.trim()}
            className="flex items-center justify-center gap-1.5 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
          >
            {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Añadir
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Tu despensa está vacía"
            description="Escanea un ticket y los productos comprados aparecerán aquí automáticamente. También puedes añadirlos a mano."
          />
        ) : (
          <div className="space-y-5 animate-fade-in">
            {grupos.map(({ cat, items: grupo }) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: categoryColors[cat] || categoryColors['Otros'] }}
                  />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {cat}
                  </h2>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {grupo.map((item) => {
                    const isBusy = busy.has(item.id)
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3">
                        <p className="flex-1 min-w-0 text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {item.producto_nombre}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => cambiarCantidad(item, -1)}
                            disabled={isBusy}
                            aria-label="Quitar una unidad"
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-90 transition-all disabled:opacity-50"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="w-7 text-center text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                            {Number(item.cantidad)}
                          </span>
                          <button
                            onClick={() => cambiarCantidad(item, 1)}
                            disabled={isBusy}
                            aria-label="Añadir una unidad"
                            className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-90 transition-all disabled:opacity-50"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            onClick={() => eliminar(item)}
                            disabled={isBusy}
                            aria-label="Eliminar de la despensa"
                            className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 ml-1"
                          >
                            {isBusy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <p className="text-center text-xs text-slate-400">
              La lista de la compra IA tiene en cuenta lo que ya hay aquí.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
