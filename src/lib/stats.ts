import { supabase } from './supabase'
import { getDisplayNames } from './households'

export interface CategoryData {
  name: string
  value: number
  color: string
}

export interface TicketSummary {
  id: string
  total: number
  supermercado: string
  fecha: string
  paid_by?: string | null
  paid_by_name?: string | null
  split_mode?: string | null
}

export interface SupermarketDatum {
  name: string
  value: number
  fill: string
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

/** Inicio (lunes 00:00) de la semana ISO que contiene `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = (d.getDay() + 6) % 7 // 0 = lunes … 6 = domingo
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function getDashboardStats(userId: string, householdId?: string | null) {
  try {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const weekStart = getWeekStart(now).toISOString()

    // 1. Obtener gasto total del mes actual (del hogar activo o personal)
    let ticketsQuery = supabase
      .from('tickets')
      .select('id, total, supermercado, fecha, paid_by, split_mode')
    ticketsQuery = householdId
      ? ticketsQuery.eq('household_id', householdId)
      : ticketsQuery.eq('user_id', userId)
    const { data: ticketsData, error: ticketsError } = await ticketsQuery
      .gte('fecha', firstDayOfMonth)
      .lte('fecha', lastDayOfMonth)
      .order('fecha', { ascending: false })

    if (ticketsError) throw ticketsError

    const totalGastado = ticketsData.reduce((acc, curr) => acc + Number(curr.total), 0)

    // Gasto de la semana en curso (lunes→hoy). La semana puede empezar en el
    // mes anterior, así que se consulta su propio rango.
    let gastoSemana = 0
    {
      let weekQuery = supabase.from('tickets').select('total, fecha')
      weekQuery = householdId
        ? weekQuery.eq('household_id', householdId)
        : weekQuery.eq('user_id', userId)
      const { data: weekData, error: weekError } = await weekQuery
        .gte('fecha', weekStart)
        .lte('fecha', lastDayOfMonth)
      if (weekError) throw weekError
      gastoSemana = (weekData || []).reduce((acc, curr) => acc + Number(curr.total), 0)
    }

    // Obtener los 3 más recientes (con nombre de quién pagó)
    const recientesRaw = ticketsData.slice(0, 3)
    const payerIds = recientesRaw.map((t) => t.paid_by).filter(Boolean) as string[]
    const payerNames = payerIds.length > 0 ? await getDisplayNames(payerIds) : {}
    const ticketsRecientes: TicketSummary[] = recientesRaw.map((t) => ({
      id: t.id,
      total: t.total,
      supermercado: t.supermercado,
      fecha: t.fecha,
      paid_by: t.paid_by ?? null,
      paid_by_name: t.paid_by ? payerNames[t.paid_by] ?? null : null,
      split_mode: t.split_mode ?? null,
    }))

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
      gastoSemana,
      ticketsRecientes,
      categorias,
      numTickets: ticketsData.length,
      ticketMedio: ticketsData.length > 0 ? totalGastado / ticketsData.length : 0,
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    throw new Error('Error al cargar las estadísticas del mes.', { cause: error })
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
    type CompareRow = {
      producto_nombre: string
      precio_unitario: number
      tickets: { supermercado: string; fecha: string }
    }
    const resultados: ProductoComparado[] = (data as unknown as CompareRow[]).map((row) => ({
      producto_nombre: row.producto_nombre,
      precio_unitario: Number(row.precio_unitario),
      supermercado: row.tickets.supermercado,
      fecha: row.tickets.fecha
    }))

    // Podemos tener el mismo producto varias veces en el mismo supermercado (distintas fechas)
    // Agruparemos por supermercado y producto para quedarnos con el más reciente o simplemente listarlos todos.
    // En este caso, devolveremos todos para ver el histórico de precios, ya que ordenamos por precio.
    
    return resultados

  } catch (error) {
    console.error('Error buscando productos:', error)
    throw new Error('No se pudo realizar la búsqueda.', { cause: error })
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

    // Resolver el nombre de quién pagó (tickets de hogar)
    let paidByName: string | null = null
    if (ticket?.paid_by) {
      const names = await getDisplayNames([ticket.paid_by])
      paidByName = names[ticket.paid_by] ?? null
    }

    return { ticket: { ...ticket, paid_by_name: paidByName }, items }
  } catch (error) {
    console.error('Error fetching ticket details:', error)
    throw new Error('No se pudo cargar el detalle del ticket.', { cause: error })
  }
}

export async function getFullStats(userId: string, householdId?: string | null) {
  try {
    let ticketsQuery = supabase
      .from('tickets')
      .select('id, total, supermercado, fecha, paid_by, split_mode')
    ticketsQuery = householdId
      ? ticketsQuery.eq('household_id', householdId)
      : ticketsQuery.eq('user_id', userId)
    const { data: tickets, error: ticketsError } = await ticketsQuery
      .order('fecha', { ascending: false })

    if (ticketsError) throw ticketsError

    // Resolver nombre de quién pagó (solo tiene sentido en tickets de hogar)
    const payerIds = tickets.map((t) => t.paid_by).filter(Boolean) as string[]
    const payerNames = payerIds.length > 0 ? await getDisplayNames(payerIds) : {}
    const historial: TicketSummary[] = tickets.map((t) => ({
      id: t.id,
      total: t.total,
      supermercado: t.supermercado,
      fecha: t.fecha,
      paid_by: t.paid_by ?? null,
      paid_by_name: t.paid_by ? payerNames[t.paid_by] ?? null : null,
      split_mode: t.split_mode ?? null,
    }))

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
      historial,
      gastoTotal,
      gastoPorSupermercado: chartDataSuper,
      gastoPorCategoria: categoriasGlobales
    }
  } catch (error) {
    console.error('Error fetching full stats:', error)
    throw new Error('No se pudieron cargar las estadísticas.', { cause: error })
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
export async function getMonthlyTrend(
  userId: string,
  months = 6,
  householdId?: string | null,
): Promise<MonthlyPoint[]> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

  let trendQuery = supabase.from('tickets').select('total, fecha')
  trendQuery = householdId
    ? trendQuery.eq('household_id', householdId)
    : trendQuery.eq('user_id', userId)
  const { data: tickets, error } = await trendQuery.gte('fecha', start.toISOString())

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

/** Lista de supermercados distintos donde ha comprado el usuario. */
export async function getSupermercados(userId: string, householdId?: string | null): Promise<string[]> {
  let q = supabase.from('tickets').select('supermercado')
  q = householdId ? q.eq('household_id', householdId) : q.eq('user_id', userId)
  const { data, error } = await q
  if (error) throw error
  const set = new Set<string>()
  ;(data || []).forEach((t) => {
    const s = (t.supermercado || '').trim()
    if (s) set.add(s)
  })
  return [...set].sort()
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

export interface PriceAlert {
  producto_nombre: string
  categoria: string
  precioAntes: number
  precioAhora: number
  variacionPct: number
  supermercadoAhora: string
  fechaAntes: string
  fechaAhora: string
}

// Umbrales para evitar ruido por redondeo / errores de OCR.
const ALERT_MIN_PCT = 5 // % mínimo de subida
const ALERT_MIN_ABS = 0.1 // € mínimos de subida absoluta

export interface PricePoint {
  price: number
  date: string
  supermercado: string
  categoria: string
  nombre: string
}

/**
 * Lógica pura: dado el historial de precios agrupado por producto, compara la
 * última compra de cada producto con la anterior y devuelve las subidas que
 * superan los umbrales, ordenadas de mayor a menor variación.
 */
export function detectPriceIncreases(
  historial: Record<string, PricePoint[]>,
  limit = 20,
): PriceAlert[] {
  const alertas: PriceAlert[] = []
  Object.values(historial).forEach((puntos) => {
    if (puntos.length < 2) return
    puntos.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const actual = puntos[puntos.length - 1]
    const anterior = puntos[puntos.length - 2]
    if (anterior.price <= 0) return

    const diff = actual.price - anterior.price
    const pct = (diff / anterior.price) * 100
    if (diff >= ALERT_MIN_ABS && pct >= ALERT_MIN_PCT) {
      alertas.push({
        producto_nombre: actual.nombre,
        categoria: actual.categoria,
        precioAntes: Number(anterior.price.toFixed(2)),
        precioAhora: Number(actual.price.toFixed(2)),
        variacionPct: Number(pct.toFixed(0)),
        supermercadoAhora: actual.supermercado,
        fechaAntes: anterior.date,
        fechaAhora: actual.date,
      })
    }
  })
  return alertas.sort((a, b) => b.variacionPct - a.variacionPct).slice(0, limit)
}

/**
 * Detecta productos cuyo precio en la última compra ha subido respecto a la
 * compra anterior del mismo producto, por encima de los umbrales definidos.
 * Usa el historial existente de `ticket_items`. Ordena de mayor a menor subida.
 */
export async function getPriceAlerts(
  userId: string,
  householdId?: string | null,
  limit = 20,
): Promise<PriceAlert[]> {
  let ticketsQuery = supabase.from('tickets').select('id, supermercado, fecha')
  ticketsQuery = householdId
    ? ticketsQuery.eq('household_id', householdId)
    : ticketsQuery.eq('user_id', userId)
  const { data: tickets, error: ticketsError } = await ticketsQuery
  if (ticketsError) throw ticketsError
  if (!tickets || tickets.length === 0) return []

  const ticketMap: Record<string, { supermercado: string; fecha: string }> = {}
  tickets.forEach((t) => {
    ticketMap[t.id] = { supermercado: t.supermercado, fecha: t.fecha }
  })

  const { data: items, error: itemsError } = await supabase
    .from('ticket_items')
    .select('ticket_id, producto_nombre, categoria, precio_unitario')
    .in('ticket_id', Object.keys(ticketMap))
  if (itemsError) throw itemsError

  // Agrupar el historial de precios por nombre normalizado de producto.
  const historial: Record<string, PricePoint[]> = {}
  ;(items || []).forEach((it) => {
    const nombre = (it.producto_nombre || '').trim()
    if (!nombre) return
    const t = ticketMap[it.ticket_id]
    if (!t) return
    const key = nombre.toLowerCase()
    if (!historial[key]) historial[key] = []
    historial[key].push({
      price: Number(it.precio_unitario),
      date: t.fecha,
      supermercado: t.supermercado || 'Otros',
      categoria: it.categoria || 'Otros',
      nombre,
    })
  })

  return detectPriceIncreases(historial, limit)
}
