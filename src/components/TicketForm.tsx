import { Plus, Trash2 } from 'lucide-react'
import { CATEGORIAS, type TicketData, type TicketItem } from '../lib/gemini'

interface TicketFormProps {
  ticketData: TicketData
  onChange: (data: TicketData) => void
}

export function TicketForm({ ticketData, onChange }: TicketFormProps) {
  const handleItemChange = (index: number, field: keyof TicketItem, value: string | number) => {
    const newItems = [...ticketData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    onChange({ ...ticketData, items: newItems })
  }

  const handleDeleteItem = (index: number) => {
    onChange({ ...ticketData, items: ticketData.items.filter((_, i) => i !== index) })
  }

  const handleAddItem = () => {
    const newItem: TicketItem = {
      producto_nombre: '',
      cantidad: 1,
      precio_unitario: 0,
      categoria: 'Otros',
    }
    onChange({ ...ticketData, items: [...ticketData.items, newItem] })
  }

  const calculado = ticketData.items.reduce(
    (acc, it) => acc + Number(it.cantidad || 0) * Number(it.precio_unitario || 0),
    0,
  )
  const descuadre = Math.abs(calculado - Number(ticketData.total || 0))

  const inputCls =
    'w-full rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 dark:text-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow'

  return (
    <div className="w-full flex-1 space-y-5">
      {/* Datos generales */}
      <section className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
        <h2 className="font-bold text-slate-900 dark:text-white">Datos generales</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Supermercado
            </label>
            <input
              type="text"
              value={ticketData.supermercado}
              onChange={(e) => onChange({ ...ticketData, supermercado: e.target.value })}
              className={inputCls}
              placeholder="Mercadona"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
              Fecha
            </label>
            <input
              type="date"
              value={ticketData.fecha}
              onChange={(e) => onChange({ ...ticketData, fecha: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
            Importe total (€)
          </label>
          <input
            type="number"
            step="0.01"
            value={ticketData.total}
            onChange={(e) => onChange({ ...ticketData, total: parseFloat(e.target.value) || 0 })}
            className={`${inputCls} !text-xl font-extrabold text-blue-600 dark:text-blue-400`}
          />
          {descuadre > 0.01 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
              ⚠ La suma de productos ({calculado.toFixed(2)}€) no coincide con el total.
            </p>
          )}
        </div>
      </section>

      {/* Productos */}
      <section className="bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-slate-900 dark:text-white">
            Productos <span className="text-slate-400 font-medium">({ticketData.items.length})</span>
          </h2>
          <button
            onClick={handleAddItem}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 transition-colors"
          >
            <Plus size={16} /> Añadir
          </button>
        </div>

        <div className="space-y-3">
          {ticketData.items.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2.5 items-end bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-100 dark:border-slate-700"
            >
              <div className="col-span-12 sm:col-span-5 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Producto
                </label>
                <input
                  type="text"
                  value={item.producto_nombre}
                  onChange={(e) => handleItemChange(index, 'producto_nombre', e.target.value)}
                  className={inputCls}
                  placeholder="Nombre del producto"
                />
              </div>
              <div className="col-span-3 sm:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ud.
                </label>
                <input
                  type="number"
                  value={item.cantidad}
                  onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 0)}
                  className={`${inputCls} text-center`}
                />
              </div>
              <div className="col-span-5 sm:col-span-3 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Categoría
                </label>
                <select
                  value={item.categoria}
                  onChange={(e) => handleItemChange(index, 'categoria', e.target.value)}
                  className={`${inputCls} !px-2`}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3 sm:col-span-2 space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Precio €
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={item.precio_unitario}
                  onChange={(e) =>
                    handleItemChange(index, 'precio_unitario', parseFloat(e.target.value) || 0)
                  }
                  className={inputCls}
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <button
                  onClick={() => handleDeleteItem(index)}
                  aria-label="Eliminar producto"
                  className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {ticketData.items.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">
              No hay productos. Pulsa «Añadir» para incluir uno.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
