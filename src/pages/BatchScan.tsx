import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Images,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Users,
  ListChecks,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { procesarTicketConGemini } from '../lib/gemini'
import { guardarTicketEnSupabase } from '../lib/tickets'
import { fileToDataUrl, splitDataUrl, isImageTooLarge } from '../lib/scan'
import { getMembers, type HouseholdMember, type SplitMode } from '../lib/households'
import { useHousehold } from '../contexts/HouseholdContext'
import { getErrorMessage } from '../lib/errors'

type ItemStatus = 'pending' | 'processing' | 'done' | 'error'
interface BatchItem {
  name: string
  file: File
  status: ItemStatus
  supermercado?: string
  total?: number
  error?: string
}

export function BatchScan() {
  const navigate = useNavigate()
  const { active } = useHousehold()

  const [items, setItems] = useState<BatchItem[]>([])
  const [processing, setProcessing] = useState(false)
  const [finished, setFinished] = useState(false)

  // Asignación a hogar (aplicada a todos los tickets del lote)
  const [shareWithHousehold, setShareWithHousehold] = useState(false)
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [paidBy, setPaidBy] = useState('')
  const [splitMode, setSplitMode] = useState<SplitMode>('shared')
  const [currentUserId, setCurrentUserId] = useState('')

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
        console.error('Error cargando miembros:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [active])

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setItems(files.map((file) => ({ name: file.name, file, status: 'pending' })))
    setFinished(false)
  }

  const updateItem = (index: number, patch: Partial<BatchItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))
  }

  const handleProcess = async () => {
    setProcessing(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) throw new Error('No hay sesión de usuario activa.')

      const household =
        active && shareWithHousehold
          ? { householdId: active.id, paidBy: paidBy || userId, splitMode }
          : undefined

      // Secuencial para no saturar la API gratuita de Gemini.
      for (let i = 0; i < items.length; i++) {
        updateItem(i, { status: 'processing' })
        try {
          const file = items[i].file
          if (isImageTooLarge(file.size)) throw new Error('Imagen demasiado grande (máx 5MB).')
          const dataUrl = await fileToDataUrl(file)
          const { base64, mimeType } = splitDataUrl(dataUrl)
          const data = await procesarTicketConGemini(base64, mimeType)
          await guardarTicketEnSupabase(data, dataUrl, userId, household)
          updateItem(i, {
            status: 'done',
            supermercado: data.supermercado,
            total: data.total,
          })
        } catch (err) {
          updateItem(i, { status: 'error', error: getErrorMessage(err) })
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(false)
      setFinished(true)
    }
  }

  const doneCount = items.filter((i) => i.status === 'done').length
  const errorCount = items.filter((i) => i.status === 'error').length

  const statusIcon = (s: ItemStatus) => {
    if (s === 'processing') return <Loader2 size={18} className="animate-spin text-blue-500" />
    if (s === 'done') return <CheckCircle2 size={18} className="text-emerald-500" />
    if (s === 'error') return <AlertCircle size={18} className="text-red-500" />
    return <Clock size={18} className="text-slate-300 dark:text-slate-600" />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-safe">
      <header className="bg-white dark:bg-slate-800 shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-2"
        >
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Escanear varios</h1>
      </header>

      <main className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full gap-5">
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Varios tickets a la vez</h2>
              <p className="text-slate-500 dark:text-slate-400">
                Selecciona varias fotos de tu galería y las procesamos y guardamos una a una.
              </p>
            </div>
            <label className="relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-5 text-lg font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all">
              <Images size={24} />
              Seleccionar fotos
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleSelect} />
            </label>
          </div>
        ) : (
          <>
            {/* Asignación a hogar (a todo el lote) */}
            {active && !processing && !finished && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      Compartir todos con «{active.name}»
                    </p>
                    <p className="text-xs text-slate-400">Se aplica a los {items.length} tickets</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={shareWithHousehold}
                    onChange={(e) => setShareWithHousehold(e.target.checked)}
                    className="w-5 h-5 accent-indigo-600"
                  />
                </label>

                {shareWithHousehold && (
                  <div className="mt-4 grid grid-cols-2 gap-2 animate-fade-in">
                    <select
                      value={paidBy}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 dark:text-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.display_name}
                          {m.user_id === currentUserId ? ' (tú)' : ''}
                        </option>
                      ))}
                    </select>
                    <select
                      value={splitMode}
                      onChange={(e) => setSplitMode(e.target.value as SplitMode)}
                      className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 dark:text-white px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="shared">{members.length <= 2 ? 'A medias' : 'A partes iguales'}</option>
                      <option value="personal">Personal</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Lista de tickets */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 p-3.5">
                  {statusIcon(it.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {it.status === 'done' && it.supermercado ? it.supermercado : it.name}
                    </p>
                    {it.status === 'error' && (
                      <p className="text-xs text-red-500 truncate">{it.error}</p>
                    )}
                  </div>
                  {it.status === 'done' && it.total != null && (
                    <span className="text-sm font-bold text-slate-900 dark:text-white shrink-0">
                      {it.total.toFixed(2)}€
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Resumen / acciones */}
            {finished ? (
              <div className="space-y-3">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <ListChecks className="text-emerald-500" size={22} />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {doneCount} guardado{doneCount === 1 ? '' : 's'}
                    {errorCount > 0 && `, ${errorCount} con error`}.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-lg shadow-lg hover:bg-blue-500 active:scale-95 transition-all"
                >
                  Ir al inicio
                </button>
              </div>
            ) : (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-lg shadow-lg hover:bg-blue-500 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Procesando {doneCount + errorCount}/{items.length}…
                  </>
                ) : (
                  <>Procesar {items.length} ticket{items.length === 1 ? '' : 's'}</>
                )}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
