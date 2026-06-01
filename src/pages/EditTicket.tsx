import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, Save, Loader2 } from 'lucide-react'
import { getTicketDetails } from '../lib/stats'
import { actualizarTicketEnSupabase } from '../lib/tickets'
import { TicketForm } from '../components/TicketForm'
import { useToast } from '../contexts/ToastContext'
import type { TicketData } from '../lib/gemini'

export function EditTicket() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const { ticket, items } = await getTicketDetails(id)
        setTicketData({
          supermercado: ticket.supermercado || '',
          fecha: (ticket.fecha || '').slice(0, 10),
          total: Number(ticket.total) || 0,
          items: (items || []).map((it: any) => ({
            producto_nombre: it.producto_nombre,
            cantidad: Number(it.cantidad),
            precio_unitario: Number(it.precio_unitario),
            categoria: it.categoria,
          })),
        })
      } catch {
        toast.error('No se pudo cargar el ticket.')
        navigate(-1)
      } finally {
        setIsLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleSave = async () => {
    if (!id || !ticketData) return
    setIsSaving(true)
    try {
      await actualizarTicketEnSupabase(id, ticketData)
      toast.success('Cambios guardados.')
      navigate(`/ticket/${id}`, { replace: true })
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !ticketData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-safe">
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm px-4 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
          >
            <ChevronLeft size={26} />
          </button>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Editar ticket</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-blue-500 active:scale-95 disabled:opacity-50 transition-all"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Guardar
        </button>
      </header>

      <main className="flex-1 p-4 lg:p-6 max-w-3xl mx-auto w-full animate-fade-in">
        <TicketForm ticketData={ticketData} onChange={setTicketData} />
      </main>
    </div>
  )
}
