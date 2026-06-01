import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../lib/errors'
import { ChevronLeft, Save, Loader2, Users, Split, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { guardarTicketEnSupabase } from '../lib/tickets'
import { getMembers, type HouseholdMember, type SplitMode } from '../lib/households'
import { useHousehold } from '../contexts/HouseholdContext'
import { TicketForm } from '../components/TicketForm'
import { useToast } from '../contexts/ToastContext'
import type { TicketData } from '../lib/gemini'

export function Review() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { active } = useHousehold()

  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Asignación a hogar
  const [shareWithHousehold, setShareWithHousehold] = useState(false)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [paidBy, setPaidBy] = useState<string>('')
  const [splitMode, setSplitMode] = useState<SplitMode>('shared')
  const [currentUserId, setCurrentUserId] = useState<string>('')

  useEffect(() => {
    if (!location.state?.ticketData) {
      navigate('/scan')
      return
    }
    // Inicializa el formulario con los datos pasados por navegación.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTicketData(location.state.ticketData)
    setImageSrc(location.state.imageSrc)
  }, [location, navigate])

  useEffect(() => {
    if (!active) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const uid = sessionData?.session?.user?.id || ''
        const list = await getMembers(active.id)
        if (cancelled) return
        setCurrentUserId(uid)
        setMembers(list)
        setPaidBy(uid)
      } catch (err) {
        console.error('Error cargando miembros del hogar:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active])

  if (!ticketData) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) throw new Error('No hay sesión de usuario activa.')

      const household =
        active && shareWithHousehold
          ? { householdId: active.id, paidBy: paidBy || userId, splitMode }
          : undefined

      await guardarTicketEnSupabase(ticketData, imageSrc || '', userId, household)
      toast.success('¡Ticket guardado correctamente!')
      navigate('/')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo guardar el ticket.'))
    } finally {
      setIsSaving(false)
    }
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
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Revisar ticket</h1>
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

      <main className="flex-1 p-4 lg:p-6 flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto w-full animate-fade-in">
        {imageSrc && (
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <div className="sticky top-24 bg-slate-900 rounded-3xl overflow-hidden shadow-md max-h-[35vh] lg:max-h-[78vh] flex items-center justify-center border border-slate-200 dark:border-slate-700">
              <img src={imageSrc} alt="Ticket" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-4">
          {/* Asignación a hogar */}
          {active && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Users size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Compartir con «{active.name}»
                  </p>
                  <p className="text-xs text-slate-400">Cuenta para el balance del hogar</p>
                </div>
                <input
                  type="checkbox"
                  checked={shareWithHousehold}
                  onChange={(e) => setShareWithHousehold(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600"
                />
              </label>

              {shareWithHousehold && (
                <div className="mt-4 space-y-4 animate-fade-in">
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
                      <Split size={13} /> Reparto
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSplitMode('shared')}
                        className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                          splitMode === 'shared'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {members.length <= 2 ? 'A medias' : 'A partes iguales'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitMode('personal')}
                        className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                          splitMode === 'personal'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Personal
                      </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      {splitMode === 'shared'
                        ? 'Se reparte entre todos los miembros; el resto le debe su parte a quien pagó.'
                        : 'Gasto propio de quien pagó; no genera deudas.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <TicketForm ticketData={ticketData} onChange={setTicketData} />
        </div>
      </main>
    </div>
  )
}
