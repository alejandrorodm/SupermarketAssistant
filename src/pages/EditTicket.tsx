import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getErrorMessage } from '../lib/errors'
import { ChevronLeft, Save, Loader2, User, Users } from 'lucide-react'
import { getTicketDetails } from '../lib/stats'
import { actualizarTicketEnSupabase } from '../lib/tickets'
import { getMembers, type HouseholdMember, type SplitMode } from '../lib/households'
import { supabase } from '../lib/supabase'
import { TicketForm } from '../components/TicketForm'
import { useToast } from '../contexts/ToastContext'
import type { TicketData } from '../lib/gemini'

interface TicketItemRow {
  producto_nombre: string
  cantidad: number
  precio_unitario: number
  categoria: string
}

export function EditTicket() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Reparto del hogar (solo si el ticket pertenece a un hogar)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [currentUserId, setCurrentUserId] = useState('')
  const [paidBy, setPaidBy] = useState<string>('')
  const [splitMode, setSplitMode] = useState<SplitMode>('shared')

  useEffect(() => {
    async function load() {
      if (!id) return
      try {
        const { ticket, items } = await getTicketDetails(id)
        setTicketData({
          supermercado: ticket.supermercado || '',
          fecha: (ticket.fecha || '').slice(0, 10),
          total: Number(ticket.total) || 0,
          items: (items || []).map((it: TicketItemRow) => ({
            producto_nombre: it.producto_nombre,
            cantidad: Number(it.cantidad),
            precio_unitario: Number(it.precio_unitario),
            categoria: it.categoria,
          })),
        })

        // Si es un ticket de hogar, cargar miembros para editar el pagador
        if (ticket.household_id) {
          setHouseholdId(ticket.household_id)
          setSplitMode((ticket.split_mode as SplitMode) || 'shared')
          const { data: sessionData } = await supabase.auth.getSession()
          const uid = sessionData?.session?.user?.id || ''
          setCurrentUserId(uid)
          const list = await getMembers(ticket.household_id)
          setMembers(list)
          setPaidBy(ticket.paid_by || uid)
        }
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
      const household = householdId ? { paidBy: paidBy || currentUserId, splitMode } : undefined
      await actualizarTicketEnSupabase(id, ticketData, household)
      toast.success('Cambios guardados.')
      navigate(`/ticket/${id}`, { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar.'))
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

      <main className="flex-1 p-4 lg:p-6 max-w-3xl mx-auto w-full animate-fade-in space-y-4">
        <TicketForm ticketData={ticketData} onChange={setTicketData} />

        {householdId && members.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 space-y-4">
            {/* Quién pagó */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <User size={13} /> ¿Quién pagó?
              </p>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 dark:text-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.display_name}
                    {m.user_id === currentUserId ? ' (tú)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Modo de reparto */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Users size={13} /> Reparto
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMode('shared')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold border transition-colors ${
                    splitMode === 'shared'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  Compartido
                </button>
                <button
                  type="button"
                  onClick={() => setSplitMode('personal')}
                  className={`rounded-xl px-3 py-2.5 text-sm font-semibold border transition-colors ${
                    splitMode === 'personal'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300'
                  }`}
                >
                  Personal
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {splitMode === 'shared'
                  ? 'Se reparte entre los miembros del hogar y cuenta para el balance.'
                  : 'Gasto solo de quien pagó; no afecta al balance del hogar.'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
