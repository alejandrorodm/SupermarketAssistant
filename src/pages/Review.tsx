import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { guardarTicketEnSupabase } from '../lib/tickets'
import type { TicketData, TicketItem } from '../lib/gemini'

export function Review() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [ticketData, setTicketData] = useState<TicketData | null>(null)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Si no hay datos (ej. recargó la página), volver a scan
    if (!location.state?.ticketData) {
      navigate('/scan')
      return
    }
    setTicketData(location.state.ticketData)
    setImageSrc(location.state.imageSrc)
  }, [location, navigate])

  if (!ticketData) return null

  const handleItemChange = (index: number, field: keyof TicketItem, value: string | number) => {
    const newItems = [...ticketData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setTicketData({ ...ticketData, items: newItems })
  }

  const handleDeleteItem = (index: number) => {
    const newItems = ticketData.items.filter((_, i) => i !== index)
    setTicketData({ ...ticketData, items: newItems })
  }

  const handleAddItem = () => {
    const newItem: TicketItem = {
      producto_nombre: 'Nuevo producto',
      cantidad: 1,
      precio_unitario: 0,
      categoria: 'Otros'
    }
    setTicketData({ ...ticketData, items: [...ticketData.items, newItem] })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      
      if (!userId) throw new Error('No hay sesión de usuario activa.')

      await guardarTicketEnSupabase(ticketData, imageSrc || '', userId)
      
      alert('¡Ticket guardado correctamente!')
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const categoriasDisponibles = [
    'Proteínas', 'Carbohidratos', 'Frutas y Verduras', 'Lácteos', 
    'Limpieza y Hogar', 'Caprichos', 'Otros'
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-safe">
      <header className="bg-white dark:bg-slate-800 shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center">
          <button 
            onClick={() => navigate(-1)} 
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-2"
          >
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Revisar Ticket</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-500 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Guardar
        </button>
      </header>

      <main className="flex-1 p-4 lg:p-6 flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto w-full">
        {/* Imagen del ticket */}
        {imageSrc && (
          <div className="w-full lg:w-1/3 flex-shrink-0">
            <div className="sticky top-24 bg-black rounded-2xl overflow-hidden shadow-md max-h-[40vh] lg:max-h-[80vh] flex items-center justify-center">
              <img src={imageSrc} alt="Ticket" className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        )}

        {/* Formulario de revisión */}
        <div className="w-full flex-1 space-y-6">
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
            <h2 className="font-semibold text-slate-900 dark:text-white text-lg border-b border-slate-100 dark:border-slate-700 pb-3">Datos Generales</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Supermercado</label>
                <input 
                  type="text" 
                  value={ticketData.supermercado}
                  onChange={(e) => setTicketData({...ticketData, supermercado: e.target.value})}
                  className="w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Fecha</label>
                <input 
                  type="date" 
                  value={ticketData.fecha}
                  onChange={(e) => setTicketData({...ticketData, fecha: e.target.value})}
                  className="w-full rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Importe Total (€)</label>
              <input 
                type="number" 
                step="0.01"
                value={ticketData.total}
                onChange={(e) => setTicketData({...ticketData, total: parseFloat(e.target.value)})}
                className="w-full font-bold text-xl rounded-xl border-slate-300 dark:border-slate-600 dark:bg-slate-700 text-blue-600 dark:text-blue-400 px-3 py-2 focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3 mb-4">
              <h2 className="font-semibold text-slate-900 dark:text-white text-lg">Productos ({ticketData.items.length})</h2>
              <button onClick={handleAddItem} className="text-blue-600 hover:text-blue-500 flex items-center gap-1 text-sm font-medium">
                <Plus size={16} /> Añadir
              </button>
            </div>
            
            <div className="space-y-4">
              {ticketData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 relative group">
                  <div className="col-span-12 sm:col-span-6 space-y-1">
                    <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Producto</label>
                    <input 
                      type="text" 
                      value={item.producto_nombre}
                      onChange={(e) => handleItemChange(index, 'producto_nombre', e.target.value)}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Ud.</label>
                    <input 
                      type="number" 
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value))}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm text-center"
                    />
                  </div>
                  
                  <div className="col-span-8 sm:col-span-3 space-y-1">
                    <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Categoría</label>
                    <select
                      value={item.categoria}
                      onChange={(e) => handleItemChange(index, 'categoria', e.target.value)}
                      className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-2 py-2 text-xs"
                    >
                      {categoriasDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="col-span-10 sm:col-span-2 space-y-1">
                    <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">Precio</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.precio_unitario}
                        onChange={(e) => handleItemChange(index, 'precio_unitario', parseFloat(e.target.value))}
                        className="w-full rounded-lg border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 text-sm"
                      />
                      <span className="absolute right-3 top-2 text-slate-400 text-sm">€</span>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex justify-end items-end h-full pb-1">
                    <button 
                      onClick={() => handleDeleteItem(index)}
                      className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
