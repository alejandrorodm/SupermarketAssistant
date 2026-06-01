import { supabase } from './supabase'

export interface CategoryData {
  name: string
  value: number
  color: string
}

export const categoryColors: Record<string, string> = {
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
      categorias,
      numTickets: ticketsData.length,
      ticketMedio: ticketsData.length > 0 ? totalGastado / ticketsData.length : 0,
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

export async function getTicketDetails(ticketId: string) {
  try {
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single()

    if (ticketError) throw ticketError

    const { data: items, error: itemsError } = await supabase
      .from('ticket_items')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('categoria')

    if (itemsError) throw itemsError

    return { ticket, items }
  } catch (error: any) {
    console.error('Error fetching ticket details:', error)
    throw new Error('No se pudo cargar el detalle del ticket.')
  }
}

export async function getFullStats(userId: string) {
  try {
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, total, supermercado, fecha')
      .eq('user_id', userId)
      .order('fecha', { ascending: false })

    if (ticketsError) throw ticketsError

    const gastoTotal = tickets.reduce((acc, curr) => acc + Number(curr.total), 0)

    const gastoSupermercado: Record<string, number> = {}
    tickets.forEach(t => {
      const sup = t.supermercado || 'Otros'
      if (!gastoSupermercado[sup]) gastoSupermercado[sup] = 0
      gastoSupermercado[sup] += Number(t.total)
    })

    const chartDataSuper = Object.keys(gastoSupermercado).map(sup => ({
      name: sup,
      value: Number(gastoSupermercado[sup].toFixed(2)),
      fill: '#3b82f6' // Azul genérico para supermercados
    })).sort((a, b) => b.value - a.value)

    // Calculo de Categorías Global
    let categoriasGlobales: CategoryData[] = []
    const ticketIds = tickets.map(t => t.id)

    if (ticketIds.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from('ticket_items')
        .select('categoria, cantidad, precio_unitario')
        .in('ticket_id', ticketIds)

      if (itemsError) throw itemsError

      const gastoPorCategoria: Record<string, number> = {}

      itemsData.forEach(item => {
        const cat = item.categoria
        const costeLineal = Number(item.cantidad) * Number(item.precio_unitario)
        if (!gastoPorCategoria[cat]) gastoPorCategoria[cat] = 0
        gastoPorCategoria[cat] += costeLineal
      })

      categoriasGlobales = Object.keys(gastoPorCategoria).map(cat => ({
        name: cat,
        value: Number(gastoPorCategoria[cat].toFixed(2)),
        color: categoryColors[cat] || categoryColors['Otros']
      })).sort((a, b) => b.value - a.value)
    }

    return {
      historial: tickets,
      gastoTotal,
      gastoPorSupermercado: chartDataSuper,
      gastoPorCategoria: categoriasGlobales
    }
  } catch (error: any) {
    console.error('Error fetching full stats:', error)
    throw new Error('No se pudieron cargar las estadísticas.')
  }
}

export interface MonthlyPoint {
  key: string // YYYY-MM
  label: string // ej. "ene"
  total: number
}

/**
 * Evolución del gasto en los últimos `months` meses (incluido el actual),
 * rellenando con 0 los meses sin compras.
 */
export async function getMonthlyTrend(userId: string, months = 6): Promise<MonthlyPoint[]> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('total, fecha')
    .eq('user_id', userId)
    .gte('fecha', start.toISOString())

  if (error) throw error

  // Inicializar los meses del rango a 0
  const buckets: Record<string, number> = {}
  const order: string[] = []
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets[key] = 0
    order.push(key)
  }

  ;(tickets || []).forEach((t) => {
    const d = new Date(t.fecha)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (key in buckets) buckets[key] += Number(t.total)
  })

  const fmt = new Intl.DateTimeFormat('es-ES', { month: 'short' })
  return order.map((key) => {
    const [y, m] = key.split('-').map(Number)
    return {
      key,
      label: fmt.format(new Date(y, m - 1, 1)).replace('.', ''),
      total: Number(buckets[key].toFixed(2)),
    }
  })
}

export interface ProductoFrecuenteRow {
  producto_nombre: string
  categoria: string
  veces: number
  precio_medio: number
}

/**
 * Productos más comprados por el usuario (agrupados por nombre normalizado),
 * usados para alimentar la lista de la compra inteligente.
 */
export async function getProductosFrecuentes(userId: string, limit = 40): Promise<ProductoFrecuenteRow[]> {
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id')
    .eq('user_id', userId)

  if (ticketsError) throw ticketsError
  const ticketIds = (tickets || []).map((t) => t.id)
  if (ticketIds.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from('ticket_items')
    .select('producto_nombre, categoria, precio_unitario')
    .in('ticket_id', ticketIds)

  if (itemsError) throw itemsError

  const map: Record<string, { nombre: string; categoria: string; veces: number; suma: number }> = {}
  ;(items || []).forEach((it) => {
    const nombre = (it.producto_nombre || '').trim()
    if (!nombre) return
    const k = nombre.toLowerCase()
    if (!map[k]) map[k] = { nombre, categoria: it.categoria || 'Otros', veces: 0, suma: 0 }
    map[k].veces += 1
    map[k].suma += Number(it.precio_unitario)
  })

  return Object.values(map)
    .map((v) => ({
      producto_nombre: v.nombre,
      categoria: v.categoria,
      veces: v.veces,
      precio_medio: Number((v.suma / v.veces).toFixed(2)),
    }))
    .sort((a, b) => b.veces - a.veces)
    .slice(0, limit)
}

export interface ExportRow {
  fecha: string
  supermercado: string
  producto: string
  categoria: string
  cantidad: number
  precio_unitario: number
  subtotal: number
}

/** Datos planos (un row por producto) listos para exportar a CSV. */
export async function getExportData(userId: string): Promise<ExportRow[]> {
  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, supermercado, fecha')
    .eq('user_id', userId)
    .order('fecha', { ascending: false })

  if (ticketsError) throw ticketsError
  if (!tickets || tickets.length === 0) return []

  const ticketMap: Record<string, { supermercado: string; fecha: string }> = {}
  tickets.forEach((t) => {
    ticketMap[t.id] = { supermercado: t.supermercado, fecha: t.fecha }
  })

  const { data: items, error: itemsError } = await supabase
    .from('ticket_items')
    .select('ticket_id, producto_nombre, categoria, cantidad, precio_unitario')
    .in('ticket_id', Object.keys(ticketMap))

  if (itemsError) throw itemsError

  return (items || []).map((it) => {
    const t = ticketMap[it.ticket_id]
    const cantidad = Number(it.cantidad)
    const precio = Number(it.precio_unitario)
    return {
      fecha: t?.fecha ?? '',
      supermercado: t?.supermercado ?? '',
      producto: it.producto_nombre,
      categoria: it.categoria,
      cantidad,
      precio_unitario: Number(precio.toFixed(2)),
      subtotal: Number((cantidad * precio).toFixed(2)),
    }
  })
}
