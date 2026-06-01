import { NavLink, useNavigate } from 'react-router-dom'
import { Home, BarChart3, Search, Sparkles, ScanLine } from 'lucide-react'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
    isActive
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
  }`

export function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 pb-safe">
      <div className="relative mx-auto max-w-2xl">
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-700/80 flex items-stretch px-2 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]">
          <NavLink to="/" className={linkClass} end>
            <Home size={22} />
            <span className="text-[10px] font-semibold">Inicio</span>
          </NavLink>
          <NavLink to="/stats" className={linkClass}>
            <BarChart3 size={22} />
            <span className="text-[10px] font-semibold">Gastos</span>
          </NavLink>

          {/* Hueco para el FAB central */}
          <div className="w-16 shrink-0" aria-hidden="true" />

          <NavLink to="/compare" className={linkClass}>
            <Search size={22} />
            <span className="text-[10px] font-semibold">Comparar</span>
          </NavLink>
          <NavLink to="/list" className={linkClass}>
            <Sparkles size={22} />
            <span className="text-[10px] font-semibold">Lista IA</span>
          </NavLink>
        </div>

        {/* FAB central de escaneo */}
        <button
          onClick={() => navigate('/scan')}
          aria-label="Escanear ticket"
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform ring-4 ring-slate-50 dark:ring-slate-900"
        >
          <ScanLine size={26} />
        </button>
      </div>
    </nav>
  )
}
