import { supabase } from './supabase'
import { getErrorMessage } from './errors'

export interface InventoryItem {
  id: string
  user_id: string
  household_id: string | null
  producto_nombre: string
  categoria: string
  cantidad: number
  updated_at: string
}

export interface InventoryScope {
  userId: string
  householdId?: string | null
}

/** Producto recién comprado que entra en la despensa. */
export interface PurchasedItem {
  producto_nombre: string
  categoria: string
  cantidad: number
}

export function normalizeName(nombre: string): string {
  return (nombre || '').trim().toLowerCase()
}

export interface MergePlan {
  /** Filas existentes a las que sumamos cantidad. */
  updates: { id: string; cantidad: number }[]
  /** Productos nuevos a insertar. */
  inserts: { producto_nombre: string; categoria: string; cantidad: number }[]
}

/**
 * Lógica pura: dado el inventario actual de un ámbito y una lista de productos
 * comprados, calcula qué filas hay que incrementar y cuáles crear, fusionando
 * por nombre normalizado. Las cantidades compradas <= 0 se tratan como 1
 * (una unidad), porque "cantidad" en un ticket suele ser peso/precio, no stock.
 */
export function mergeIntoInventory(existing: InventoryItem[], purchased: PurchasedItem[]): MergePlan {
  const byName = new Map<string, InventoryItem>()
  for (const it of existing) byName.set(normalizeName(it.producto_nombre), it)

  // Agrupar lo comprado por nombre normalizado (suma de unidades).
  const compradoPorNombre = new Map<string, PurchasedItem>()
  for (const p of purchased) {
    const nombre = (p.producto_nombre || '').trim()
    if (!nombre) continue
    const key = normalizeName(nombre)
    const unidades = Number(p.cantidad) > 0 ? Math.round(Number(p.cantidad)) : 1
    const prev = compradoPorNombre.get(key)
    if (prev) {
      prev.cantidad += unidades
    } else {
      compradoPorNombre.set(key, {
        producto_nombre: nombre,
        categoria: p.categoria || 'Otros',
        cantidad: unidades,
      })
    }
  }

  const updates: MergePlan['updates'] = []
  const inserts: MergePlan['inserts'] = []
  for (const [key, comprado] of compradoPorNombre) {
    const fila = byName.get(key)
    if (fila) {
      updates.push({ id: fila.id, cantidad: Number(fila.cantidad) + comprado.cantidad })
    } else {
      inserts.push(comprado)
    }
  }
  return { updates, inserts }
}

function scopeQuery(scope: InventoryScope) {
  const q = supabase.from('inventory_items').select('*')
  return scope.householdId
    ? q.eq('household_id', scope.householdId)
    : q.eq('user_id', scope.userId).is('household_id', null)
}

/** Devuelve la despensa del ámbito (personal o del hogar activo). */
export async function getInventory(scope: InventoryScope): Promise<InventoryItem[]> {
  try {
    const { data, error } = await scopeQuery(scope).order('producto_nombre', { ascending: true })
    if (error) throw error
    return (data as InventoryItem[]) || []
  } catch (error) {
    console.error('Error cargando inventario:', error)
    throw new Error(getErrorMessage(error, 'No se pudo cargar el inventario.'), { cause: error })
  }
}

/**
 * Suma a la despensa los productos de una compra recién guardada. No lanza:
 * un fallo aquí no debe impedir guardar el ticket (se registra y se ignora).
 */
export async function addPurchaseToInventory(
  purchased: PurchasedItem[],
  scope: InventoryScope,
): Promise<void> {
  try {
    if (purchased.length === 0) return
    const existing = await getInventory(scope)
    const { updates, inserts } = mergeIntoInventory(existing, purchased)

    if (inserts.length > 0) {
      const rows = inserts.map((i) => ({
        user_id: scope.userId,
        household_id: scope.householdId ?? null,
        producto_nombre: i.producto_nombre,
        categoria: i.categoria,
        cantidad: i.cantidad,
      }))
      const { error } = await supabase.from('inventory_items').insert(rows)
      if (error) throw error
    }

    for (const u of updates) {
      const { error } = await supabase
        .from('inventory_items')
        .update({ cantidad: u.cantidad, updated_at: new Date().toISOString() })
        .eq('id', u.id)
      if (error) throw error
    }
  } catch (error) {
    console.warn('No se pudo actualizar el inventario tras la compra:', error)
  }
}

/** Añade un producto a mano a la despensa (o lo incrementa si ya existe). */
export async function addManualItem(
  producto_nombre: string,
  categoria: string,
  scope: InventoryScope,
): Promise<void> {
  try {
    const nombre = producto_nombre.trim()
    if (!nombre) throw new Error('Escribe un nombre de producto.')
    const existing = await getInventory(scope)
    const { updates, inserts } = mergeIntoInventory(existing, [
      { producto_nombre: nombre, categoria: categoria || 'Otros', cantidad: 1 },
    ])
    if (inserts.length > 0) {
      const { error } = await supabase.from('inventory_items').insert({
        user_id: scope.userId,
        household_id: scope.householdId ?? null,
        producto_nombre: inserts[0].producto_nombre,
        categoria: inserts[0].categoria,
        cantidad: inserts[0].cantidad,
      })
      if (error) throw error
    } else if (updates.length > 0) {
      const { error } = await supabase
        .from('inventory_items')
        .update({ cantidad: updates[0].cantidad, updated_at: new Date().toISOString() })
        .eq('id', updates[0].id)
      if (error) throw error
    }
  } catch (error) {
    console.error('Error añadiendo producto al inventario:', error)
    throw new Error(getErrorMessage(error, 'No se pudo añadir el producto.'), { cause: error })
  }
}

/**
 * Fija la cantidad de una fila. Si baja a 0 o menos, elimina la fila (consumida).
 */
export async function setInventoryQuantity(id: string, cantidad: number): Promise<void> {
  try {
    if (cantidad <= 0) {
      await removeInventoryItem(id)
      return
    }
    const { error } = await supabase
      .from('inventory_items')
      .update({ cantidad, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  } catch (error) {
    console.error('Error actualizando cantidad del inventario:', error)
    throw new Error(getErrorMessage(error, 'No se pudo actualizar la cantidad.'), { cause: error })
  }
}

/** Elimina por completo un producto de la despensa. */
export async function removeInventoryItem(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id)
    if (error) throw error
  } catch (error) {
    console.error('Error eliminando producto del inventario:', error)
    throw new Error(getErrorMessage(error, 'No se pudo eliminar el producto.'), { cause: error })
  }
}
