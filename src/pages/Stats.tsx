import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, PieChart as PieChartIcon, TrendingUp, Calendar, ShoppingCart, Search } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { BottomNav } from '../components/BottomNav'
import { supabase } from '../lib/supabase'
import { getFullStats } from '../lib/stats'

export function Stats() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<{ historial: any[], gastoTotal: number, gastoPorSupermercado: any[] } | null>(null)

  useEffect(() => {
    async function loadStats() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData?.session?.user) {
          const stats = await getFullStats(sessionData.session.user.id)
          setData(stats)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <header className="bg-white dark:bg-slate-800 px-6 pt-12 pb-6 shadow-sm rounded-b-3xl">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <PieChartIcon size={24} className="text-blue-600" />
          Tus Estadísticas
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Resumen global de todos tus gastos</p>
      </header>

      <main className="p-6 space-y-6 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : !data || data.historial.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Aún no hay datos</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Escanea algunos tickets para generar estadísticas.</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-6 text-white shadow-lg shadow-indigo-600/30">
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <TrendingUp size={18} />
                <span className="font-medium">Gasto Histórico Total</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-extrabold tracking-tight">{data.gastoTotal.toFixed(2)}</span>
                <span className="text-xl font-medium text-indigo-200 pb-1">€</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white mb-6">Gasto por Supermercado</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.gastoPorSupermercado} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(2)} €`, 'Gastado']}
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                      {data.gastoPorSupermercado.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-4 px-2">Historial Completo</h3>
              <div className="space-y-3">
                {data.historial.map((ticket, i) => (
                  <button 
                    key={i} 
                    onClick={() => navigate(`/ticket/${ticket.id}`)}
                    className="w-full bg-white dark:bg-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <ShoppingCart size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{ticket.supermercado}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar size={12} />
                          {new Date(ticket.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {Number(ticket.total).toFixed(2)} €
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
