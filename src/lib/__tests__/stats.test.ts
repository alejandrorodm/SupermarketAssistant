import { describe, it, expect } from 'vitest'
import { detectPriceIncreases, type PricePoint } from '../stats'

const p = (nombre: string, price: number, date: string): PricePoint => ({
  nombre,
  price,
  date,
  supermercado: 'Test',
  categoria: 'Otros',
})

describe('detectPriceIncreases', () => {
  it('marca subidas reales y las ordena de mayor a menor', () => {
    const historial: Record<string, PricePoint[]> = {
      leche: [p('Leche', 1.0, '2026-03-01'), p('Leche', 1.2, '2026-05-01')], // +20%
      aceite: [
        p('Aceite', 6.0, '2026-01-01'),
        p('Aceite', 4.0, '2026-04-01'),
        p('Aceite', 5.0, '2026-05-01'),
      ], // compara últimas dos: 4 -> 5 = +25%
    }
    const r = detectPriceIncreases(historial)
    expect(r.map((a) => a.producto_nombre)).toEqual(['Aceite', 'Leche'])
    expect(r[0].variacionPct).toBe(25)
    expect(r[1].variacionPct).toBe(20)
  })

  it('ignora bajadas de precio', () => {
    const r = detectPriceIncreases({
      pan: [p('Pan', 1.5, '2026-04-01'), p('Pan', 1.3, '2026-05-01')],
    })
    expect(r).toHaveLength(0)
  })

  it('ignora subidas por debajo del umbral porcentual', () => {
    const r = detectPriceIncreases({
      cafe: [p('Café', 5.0, '2026-04-01'), p('Café', 5.2, '2026-05-01')], // +4%
    })
    expect(r).toHaveLength(0)
  })

  it('ignora subidas con variación absoluta mínima', () => {
    const r = detectPriceIncreases({
      chicle: [p('Chicle', 1.0, '2026-04-01'), p('Chicle', 1.05, '2026-05-01')], // +5% pero +0,05€
    })
    expect(r).toHaveLength(0)
  })

  it('ignora productos con una sola compra', () => {
    const r = detectPriceIncreases({ sal: [p('Sal', 0.5, '2026-05-01')] })
    expect(r).toHaveLength(0)
  })

  it('respeta el límite de resultados', () => {
    const historial: Record<string, PricePoint[]> = {}
    for (let i = 0; i < 30; i++) {
      historial[`prod${i}`] = [
        p(`Prod${i}`, 1.0, '2026-01-01'),
        p(`Prod${i}`, 2.0, '2026-05-01'),
      ]
    }
    expect(detectPriceIncreases(historial, 5)).toHaveLength(5)
  })
})
