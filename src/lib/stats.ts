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

export interface ProductoComparado {
  producto_nombre: string
  precio_unitario: number
  supermercado: string
  fecha: string
}

export async function buscarPreciosProducto(userId: string, termino: string): Promise<ProductoComparado[]> {
  try {
    if (!termino.trim()) return []

    // Buscar items cuyo nombre contenga el término, y hacer JOIN con tickets para tener supermercado y fecha
    const { data, error } = await supabase
      .from('ticket_items')
      .select(`
        producto_nombre,
        precio_unitario,
        tickets!inner(supermercado, fecha, user_id)
      `)
      .ilike('producto_nombre', `%${termino}%`)
      .eq('tickets.user_id', userId)
      .order('precio_unitario', { ascending: true })
      // Limitamos a 50 resultados para no saturar
      .limit(50)

    if (error) throw error

    // Formatear los datos para la interfaz
    const resultados: ProductoComparado[] = data.map((row: any) => ({
      producto_nombre: row.producto_nombre,
      precio_unitario: Number(row.precio_unitario),
      supermercado: row.tickets.supermercado,
      fecha: row.tickets.fecha
    }))

    // Podemos tener el mismo producto varias veces en el mismo supermercado (distintas fechas)
    // Agruparemos por supermercado y producto para quedarnos con el más reciente o simplemente listarlos todos.
    // En este caso, devolveremos todos para ver el histórico de precios, ya que ordenamos por precio.
    
    return resultados

  } catch (error: any) {
    console.error('Error buscando productos:', error)
    throw new Error('No se pudo realizar la búsqueda.')
  }
}
