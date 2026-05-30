import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, ScanLine, ShoppingCart, TrendingUp, ChevronRight, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import { supabase } from '../lib/supabase'
import { getDashboardStats } from '../lib/stats'
import type { CategoryData } from '../lib/stats'
import { BottomNav } from '../components/BottomNav'

interface DashboardData {
  totalGastado: number
  ticketsRecientes: any[]
  categorias: CategoryData[]
}

export function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    async function loadData() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const user = sessionData?.session?.user
        if (user) {
          setUserName(user.email?.split('@')[0] || 'Usuario')
          const stats = await getDashboardStats(user.id)
          setData(stats)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const currentMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date())

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Cabecera */}
      <header className="bg-white dark:bg-slate-800 px-6 pt-12 pb-6 shadow-sm flex justify-between items-center rounded-b-3xl">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Hola de nuevo,</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">{userName}</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="p-6 space-y-6 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : (
          <>
            {/* Tarjeta de Resumen */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/30">
              <div className="flex items-center gap-2 text-blue-100 mb-2">
                <TrendingUp size={18} />
                <span className="font-medium">Gasto en {currentMonth}</span>
              </div>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-4xl font-extrabold tracking-tight">{data?.totalGastado.toFixed(2)}</span>
                <span className="text-xl font-medium text-blue-200 pb-1">€</span>
              </div>
            </div>

            {/* Acción Principal */}
            <button 
              onClick={() => navigate('/scan')}
              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-3xl p-5 flex items-center justify-between group hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ScanLine size={24} />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg">Escanear Ticket</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Añade una nueva compra</p>
                </div>
              </div>
              <ChevronRight className="text-slate-400 group-hover:text-blue-600 transition-colors" />
            </button>

            {/* Gráfico de Categorías */}
            {data && data.categorias.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">Desglose por Categoría</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.categorias}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {data.categorias.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: number) => [`${value.toFixed(2)} €`, 'Gastado']}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-y-3 mt-4">
                  {data.categorias.map((cat, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                      <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{cat.name}</span>
                      <span className="text-slate-900 dark:text-white font-bold ml-auto">{cat.value.toFixed(0)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compras Recientes */}
            <div>
              <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Últimas compras</h3>
                <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">Ver todo</button>
              </div>
              
              <div className="space-y-3">
                {data?.ticketsRecientes.length === 0 ? (
                  <div className="text-center p-6 bg-slate-100 dark:bg-slate-800 rounded-3xl">
                    <p className="text-slate-500 dark:text-slate-400">Aún no hay compras este mes.</p>
                  </div>
                ) : (
                  data?.ticketsRecientes.map((ticket, i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
                          <ShoppingCart size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{ticket.supermercado}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(ticket.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white">{Number(ticket.total).toFixed(2)} €</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
