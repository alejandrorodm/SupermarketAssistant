import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../lib/errors'
import {
  ChevronLeft,
  Wallet,
  Moon,
  Sun,
  Download,
  LogOut,
  Check,
  Loader2,
  Mail,
  Users,
  ChevronRight,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import { getBudget, setBudget } from '../lib/budget'
import { getExportData } from '../lib/stats'
import { downloadCSV } from '../lib/export'
import { useTheme } from '../contexts/ThemeContext'
import { useToast } from '../contexts/ToastContext'

export function Settings() {
  const navigate = useNavigate()
  const toast = useToast()
  const { theme, setTheme } = useTheme()
  const { user } = useUser()

  const [budgetInput, setBudgetInput] = useState('')
  const [savedBudget, setSavedBudget] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (user) {
      const b = getBudget(user.id)
      // Inicializa el formulario con el presupuesto guardado del usuario.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSavedBudget(b)
      setBudgetInput(b ? String(b) : '')
    }
  }, [user])

  const handleSaveBudget = () => {
    if (!user) return
    const value = parseFloat(budgetInput)
    if (budgetInput.trim() === '' || !Number.isFinite(value) || value <= 0) {
      setBudget(user.id, null)
      setSavedBudget(null)
      toast.info('Presupuesto eliminado.')
      return
    }
    setBudget(user.id, value)
    setSavedBudget(value)
    toast.success('Presupuesto guardado.')
  }

  const handleExport = async () => {
    if (!user) return
    setIsExporting(true)
    try {
      const rows = await getExportData(user.id)
      if (rows.length === 0) {
        toast.info('No hay datos para exportar todavía.')
        return
      }
      const today = new Date().toISOString().slice(0, 10)
      downloadCSV(`ticketsaver-${today}.csv`, rows)
      toast.success(`Exportadas ${rows.length} líneas a CSV.`)
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo exportar.'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm px-4 py-3.5 flex items-center sticky top-0 z-10 pt-safe">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
        >
          <ChevronLeft size={26} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Ajustes</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Cuenta */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Cuenta</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.email}</p>
              <p className="text-xs text-slate-400">Sesión activa</p>
            </div>
          </div>
        </section>

        {/* Hogares compartidos */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Cuentas compartidas
          </h2>
          <button
            onClick={() => navigate('/households')}
            className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:border-indigo-500 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Users size={18} />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Hogares</p>
              <p className="text-xs text-slate-400">Comparte gastos y cuadra cuentas en pareja o grupo</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
          </button>
        </section>

        {/* Metas y logros */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Progreso
          </h2>
          <button
            onClick={() => navigate('/goals')}
            className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:border-emerald-500 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Trophy size={18} />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Metas y logros</p>
              <p className="text-xs text-slate-400">Meta de ahorro, racha y medallas</p>
            </div>
            <ChevronRight size={18} className="text-slate-300 dark:text-slate-600" />
          </button>
        </section>

        {/* Presupuesto */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Presupuesto mensual
          </h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 mb-3">
              <Wallet size={18} className="text-blue-600 dark:text-blue-400" />
              <p className="text-sm">Define tu límite de gasto para recibir avisos en el panel.</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  step="10"
                  inputMode="decimal"
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="Ej: 300"
                  className="w-full rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 dark:text-white pl-4 pr-9 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
              </div>
              <button
                onClick={handleSaveBudget}
                className="px-5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 active:scale-95 transition-all flex items-center gap-2"
              >
                <Check size={18} /> Guardar
              </button>
            </div>
            {savedBudget != null && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
                Presupuesto actual: {savedBudget.toFixed(2)}€/mes
              </p>
            )}
          </div>
        </section>

        {/* Apariencia */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Apariencia</h2>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-2 border border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors ${
                theme === 'light'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Sun size={18} /> Claro
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Moon size={18} /> Oscuro
            </button>
          </div>
        </section>

        {/* Datos */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">Datos</h2>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3 hover:border-blue-500 transition-colors disabled:opacity-60"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Exportar a CSV</p>
              <p className="text-xs text-slate-400">Descarga todos tus tickets y productos</p>
            </div>
          </button>
        </section>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <LogOut size={18} />
          </div>
          <span className="font-semibold">Cerrar sesión</span>
        </button>

        <p className="text-center text-xs text-slate-400 pt-2">TicketSaver · v1.0</p>
      </main>
    </div>
  )
}
