import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../lib/errors'
import { ChevronLeft, Calendar, Loader2, ShoppingCart, Pencil, Trash2, ImageIcon } from 'lucide-react'
import { getTicketDetails, categoryColors } from '../lib/stats'
import { eliminarTicket } from '../lib/tickets'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../contexts/ToastContext'

interface TicketRow {
  id: string
  supermercado: string
  fecha: string
  total: number
  ticket_image_url: string | null
}
interface ItemRow {
  id: string
  producto_nombre: string
  cantidad: number
  precio_unitario: number
  categoria: string
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [data, setData] = useState<{ ticket: TicketRow; items: ItemRow[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function loadData() {
      if (!id) return
      try {
        const details = await getTicketDetails(id)
        setData(details)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await eliminarTicket(id)
      toast.success('Ticket eliminado.')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo eliminar.'))
      setIsDeleting(false)
      setConfirmOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-6">
        <p className="text-slate-500 mb-4">No se pudo encontrar el ticket.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">
          Volver
        </button>
      </div>
    )
  }

  const { ticket, items } = data

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-safe">
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm px-4 py-3.5 flex items-center justify-between sticky top-0 z-10 pt-safe">
        <div className="flex items-center min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
          >
            <ChevronLeft size={26} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Detalle del ticket</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/ticket/${id}/edit`)}
            aria-label="Editar"
            className="p-2.5 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <Pencil size={19} />
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            aria-label="Eliminar"
            className="p-2.5 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={19} />
          </button>
        </div>
      </header>

      <main className="p-5 max-w-3xl mx-auto space-y-5 animate-fade-in">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/30">
          <div className="flex justify-between items-start mb-6 gap-3">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <ShoppingCart size={24} className="shrink-0" />
                <span className="min-w-0 break-words">{ticket.supermercado}</span>
              </h2>
              <div className="flex items-center gap-1.5 text-blue-100 text-sm font-medium">
                <Calendar size={16} className="shrink-0" />
                {new Date(ticket.fecha).toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
            {ticket.ticket_image_url && (
              <a
                href={ticket.ticket_image_url}
                target="_blank"
                rel="noreferrer"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              >
                <ImageIcon size={14} /> Foto
              </a>
            )}
          </div>
          <div className="pt-4 border-t border-blue-400/30">
            <p className="text-blue-100 text-sm mb-1">Importe total</p>
            <div className="text-4xl font-extrabold">{Number(ticket.total).toFixed(2)} €</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 border-b border-slate-100 dark:border-slate-700 pb-3">
            Productos ({items.length})
          </h3>
          <div className="space-y-3.5">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: categoryColors[item.categoria] || categoryColors['Otros'] }}
                  />
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight truncate">
                      {item.producto_nombre}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {item.cantidad} {Number(item.cantidad) === 1 ? 'ud.' : 'uds.'}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        {item.categoria}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {(Number(item.cantidad) * Number(item.precio_unitario)).toFixed(2)} €
                  </div>
                  {Number(item.cantidad) > 1 && (
                    <div className="text-xs text-slate-400">
                      a {Number(item.precio_unitario).toFixed(2)} €/ud.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Eliminar este ticket?"
        message="Se borrará el ticket y todos sus productos de forma permanente. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        loading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
