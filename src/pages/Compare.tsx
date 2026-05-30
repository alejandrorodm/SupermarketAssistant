import React, { useState, useEffect } from 'react'
import { Search, Loader2, Trophy, Tag, Calendar, MapPin } from 'lucide-react'
import { BottomNav } from '../components/BottomNav'
import { supabase } from '../lib/supabase'
import { buscarPreciosProducto } from '../lib/stats'
import type { ProductoComparado } from '../lib/stats'
import { useDebounce } from '../hooks/useDebounce' // Tendré que crear este hook

export function Compare() {
  const [searchTerm, setSearchTerm] = useState('')
  const [resultados, setResultados] = useState<ProductoComparado[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [userId, setUserId] = useState<string>('')
  
  // Custom hook para no hacer llamadas a la DB por cada letra
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUserId(data.session.user.id)
      }
    })
  }, [])

  useEffect(() => {
    async function buscar() {
      if (!debouncedSearchTerm.trim() || !userId) {
        setResultados([])
        return
      }

      setIsLoading(true)
      try {
        const res = await buscarPreciosProducto(userId, debouncedSearchTerm)
        setResultados(res)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    buscar()
  }, [debouncedSearchTerm, userId])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      <header className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-12 pb-8 shadow-lg rounded-b-3xl text-white">
        <h1 className="text-2xl font-bold mb-2">Comparador</h1>
        <p className="text-blue-100 text-sm mb-6">Busca un producto y descubre dónde es más barato.</p>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            className="block w-full pl-11 pr-4 py-4 bg-white text-slate-900 rounded-2xl shadow-lg border-0 focus:ring-4 focus:ring-blue-400/30 font-medium placeholder-slate-400 transition-shadow"
            placeholder="Ej: Leche, Huevos, Papel..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <Loader2 className="animate-spin text-blue-500" size={20} />
            </div>
          )}
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {searchTerm.length > 0 && !isLoading && resultados.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Search size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Sin resultados</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">No se ha encontrado "{searchTerm}" en tus tickets guardados.</p>
          </div>
        )}

        {resultados.length > 0 && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 px-2">
              Se encontraron {resultados.length} resultados (ordenados por precio)
            </p>
            
            {resultados.map((item, index) => {
              const isMejorPrecio = index === 0; // Como vienen ordenados ASC, el 0 es el más barato
              
              return (
                <div 
                  key={index} 
                  className={`relative overflow-hidden rounded-3xl p-5 border shadow-sm transition-all ${
                    isMejorPrecio 
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10 border-green-200 dark:border-green-800' 
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                  }`}
                >
                  {isMejorPrecio && (
                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-end justify-start p-5">
                      <Trophy size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  
                  <div className="pr-10">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight mb-1">
                      {item.producto_nombre}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 text-sm font-medium">
                        <MapPin size={16} className="text-blue-500" />
                        {item.supermercado}
                      </div>
                      
                      <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs">
                        <Calendar size={14} />
                        {new Date(item.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Tag size={14} />
                      Precio Unitario
                    </div>
                    <div className={`text-2xl font-extrabold ${isMejorPrecio ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                      {item.precio_unitario.toFixed(2)} <span className="text-sm font-medium opacity-70">€</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {searchTerm.length === 0 && (
          <div className="text-center py-12 px-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Encuentra el mejor precio</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-xs mx-auto">
              Busca productos que ya hayas comprado para comparar su precio entre diferentes supermercados.
            </p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
