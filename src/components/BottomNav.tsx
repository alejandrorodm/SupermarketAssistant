import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Receipt, BarChart3, Calculator } from 'lucide-react'

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-around p-3 z-10 pb-safe">
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center p-2 ${
            isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`
        }
      >
        <LayoutDashboard size={24} />
        <span className="text-[10px] mt-1 font-medium">Dashboard</span>
      </NavLink>

      <NavLink
        to="/scan"
        className={({ isActive }) =>
          `flex flex-col items-center p-2 ${
            isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`
        }
      >
        <Receipt size={24} />
        <span className="text-[10px] mt-1 font-medium">Escanear</span>
      </NavLink>

      <NavLink
        to="/stats"
        className={({ isActive }) =>
          `flex flex-col items-center p-2 ${
            isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`
        }
      >
        <BarChart3 size={24} />
        <span className="text-[10px] mt-1 font-medium">Gastos</span>
      </NavLink>

      <NavLink
        to="/compare"
        className={({ isActive }) =>
          `flex flex-col items-center p-2 ${
            isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`
        }
      >
        <Calculator size={24} />
        <span className="text-[10px] mt-1 font-medium">Comparar</span>
      </NavLink>
    </nav>
  )
}
