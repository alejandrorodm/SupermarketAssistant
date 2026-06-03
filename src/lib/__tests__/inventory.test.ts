import { describe, it, expect } from 'vitest'
import { mergeIntoInventory, normalizeName, type InventoryItem } from '../inventory'

function fila(id: string, nombre: string, cantidad: number, categoria = 'Otros'): InventoryItem {
  return {
    id,
    user_id: 'u1',
    household_id: null,
    producto_nombre: nombre,
    categoria,
    cantidad,
    updated_at: '2026-01-01',
  }
}

describe('normalizeName', () => {
  it('recorta y pasa a minúsculas', () => {
    expect(normalizeName('  Leche Entera ')).toBe('leche entera')
    expect(normalizeName('')).toBe('')
  })
})

describe('mergeIntoInventory', () => {
  it('inserta productos nuevos que no existían', () => {
    const plan = mergeIntoInventory([], [{ producto_nombre: 'Pan', categoria: 'Carbohidratos', cantidad: 1 }])
    expect(plan.inserts).toHaveLength(1)
    expect(plan.updates).toHaveLength(0)
    expect(plan.inserts[0]).toMatchObject({ producto_nombre: 'Pan', categoria: 'Carbohidratos', cantidad: 1 })
  })

  it('incrementa la cantidad de productos ya existentes (match por nombre normalizado)', () => {
    const plan = mergeIntoInventory(
      [fila('a', 'Leche', 2)],
      [{ producto_nombre: '  leche ', categoria: 'Lácteos', cantidad: 1 }],
    )
    expect(plan.inserts).toHaveLength(0)
    expect(plan.updates).toEqual([{ id: 'a', cantidad: 3 }])
  })

  it('trata cantidades <= 0 o decimales como 1 unidad (el peso no es stock)', () => {
    const plan = mergeIntoInventory([], [
      { producto_nombre: 'Plátanos', categoria: 'Frutas y Verduras', cantidad: 0.85 },
      { producto_nombre: 'Tomates', categoria: 'Frutas y Verduras', cantidad: 0 },
    ])
    expect(plan.inserts.map((i) => i.cantidad)).toEqual([1, 1])
  })

  it('agrupa líneas repetidas del mismo producto en la compra', () => {
    const plan = mergeIntoInventory([], [
      { producto_nombre: 'Yogur', categoria: 'Lácteos', cantidad: 1 },
      { producto_nombre: 'yogur', categoria: 'Lácteos', cantidad: 2 },
    ])
    expect(plan.inserts).toHaveLength(1)
    expect(plan.inserts[0].cantidad).toBe(3)
  })

  it('ignora productos sin nombre', () => {
    const plan = mergeIntoInventory([], [{ producto_nombre: '   ', categoria: 'Otros', cantidad: 1 }])
    expect(plan.inserts).toHaveLength(0)
    expect(plan.updates).toHaveLength(0)
  })

  it('mezcla inserciones y actualizaciones en la misma compra', () => {
    const plan = mergeIntoInventory(
      [fila('a', 'Café', 1)],
      [
        { producto_nombre: 'Café', categoria: 'Otros', cantidad: 1 },
        { producto_nombre: 'Azúcar', categoria: 'Otros', cantidad: 1 },
      ],
    )
    expect(plan.updates).toEqual([{ id: 'a', cantidad: 2 }])
    expect(plan.inserts).toHaveLength(1)
    expect(plan.inserts[0].producto_nombre).toBe('Azúcar')
  })
})
