import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Calendar, Loader2, Tag, ShoppingCart } from 'lucide-react'
import { getTicketDetails } from '../lib/stats'

export function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [data, setData] = useState<{ ticket: any, items: any[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!id) return
      try {
        const details = await getTicketDetails(id)
        setData(details)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex justify-center items-center">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col justify-center items-center p-6">
        <p className="text-slate-500 mb-4">No se pudo encontrar el ticket.</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Volver</button>
      </div>
    )
  }

  const { ticket, items } = data

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-safe">
      <header className="bg-white dark:bg-slate-800 shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-3"
        >
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Detalle del Ticket</h1>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Cabecera del Ticket */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <ShoppingCart size={24} />
                {ticket.supermercado}
              </h2>
              <div className="flex items-center gap-1.5 text-blue-100 text-sm font-medium">
                <Calendar size={16} />
                {new Date(ticket.fecha).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            
            {ticket.ticket_image_url && (
              <a 
                href={ticket.ticket_image_url} 
                target="_blank" 
                rel="noreferrer"
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              >
                Ver Foto original
              </a>
            )}
          </div>
          
          <div className="pt-4 border-t border-blue-400/30">
            <p className="text-blue-100 text-sm mb-1">Importe Total</p>
            <div className="text-4xl font-extrabold">{Number(ticket.total).toFixed(2)} €</div>
          </div>
        </div>

        {/* Lista de Productos */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-lg border-b border-slate-100 dark:border-slate-700 pb-3">Productos ({items.length})</h3>
          
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between items-center group">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-tight mb-1">{item.producto_nombre}</h4>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-md">
                      {item.cantidad} {item.cantidad === 1 ? 'ud.' : 'uds.'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                      {item.categoria}
                    </span>
                  </div>
                </div>
                
                <div className="text-right ml-4">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {(Number(item.cantidad) * Number(item.precio_unitario)).toFixed(2)} €
                  </div>
                  {item.cantidad > 1 && (
                    <div className="text-xs text-slate-400">
                      a {Number(item.precio_unitario).toFixed(2)} €/ud.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
