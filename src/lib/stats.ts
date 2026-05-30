import { supabase } from './supabase'

export interface CategoryData {
  name: string
  value: number
  color: string
}

const categoryColors: Record<string, string> = {
  'Proteínas': '#3b82f6', // blue-500
  'Carbohidratos': '#eab308', // yellow-500
  'Frutas y Verduras': '#22c55e', // green-500
  'Lácteos': '#06b6d4', // cyan-500
  'Limpieza y Hogar': '#8b5cf6', // violet-500
  'Caprichos': '#ec4899', // pink-500
  'Otros': '#94a3b8' // slate-400
}

export async function getDashboardStats(userId: string) {
  try {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // 1. Obtener gasto total del mes actual
    const { data: ticketsData, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, total, supermercado, fecha')
      .eq('user_id', userId)
      .gte('fecha', firstDayOfMonth)
      .lte('fecha', lastDayOfMonth)
      .order('fecha', { ascending: false })

    if (ticketsError) throw ticketsError

    const totalGastado = ticketsData.reduce((acc, curr) => acc + Number(curr.total), 0)
    
    // Obtener los 3 más recientes
    const ticketsRecientes = ticketsData.slice(0, 3)

    // 2. Obtener items del mes actual para las categorías
    const ticketIds = ticketsData.map(t => t.id)
    let categorias: CategoryData[] = []

    if (ticketIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('ticket_items')
        .select('categoria, cantidad, precio_unitario')
        .in('ticket_id', ticketIds)

      if (itemsError) throw itemsError

      const gastoPorCategoria: Record<string, number> = {}

      itemsData.forEach(item => {
        const cat = item.categoria
        // Calculamos el coste total de esa línea (cantidad * precio_unitario)
        const costeLineal = Number(item.cantidad) * Number(item.precio_unitario)
        
        if (!gastoPorCategoria[cat]) {
          gastoPorCategoria[cat] = 0
        }
        gastoPorCategoria[cat] += costeLineal
      })

      categorias = Object.keys(gastoPorCategoria).map(cat => ({
        name: cat,
        value: Number(gastoPorCategoria[cat].toFixed(2)),
        color: categoryColors[cat] || categoryColors['Otros']
      }))
      
      // Ordenar de mayor a menor gasto
      categorias.sort((a, b) => b.value - a.value)
    }

    return {
      totalGastado,
      ticketsRecientes,
      categorias
    }
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    throw new Error('Error al cargar las estadísticas del mes.')
  }
}
