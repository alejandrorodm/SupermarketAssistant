import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { guardarTicketEnSupabase } from '../lib/tickets'
import { TicketForm } from '../components/TicketForm'
import { useToast } from '../contexts/ToastContext'
import type { TicketData } from '../lib/gemini'

export function Review() {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()

  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!location.state?.ticketData) {
      navigate('/scan')
      return
    }
    setTicketData(location.state.ticketData)
    setImageSrc(location.state.imageSrc)
  }, [location, navigate])

  if (!ticketData) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) throw new Error('No hay sesión de usuario activa.')

      await guardarTicketEnSupabase(ticketData, imageSrc || '', userId)
      toast.success('¡Ticket guardado correctamente!')
      navigate('/')
    } catch (err: any) {
      toast.error(err.message || 'No se pudo guardar el ticket.')
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
        <TicketForm ticketData={ticketData} onChange={setTicketData} />
      </main>
    </div>
  )
}
