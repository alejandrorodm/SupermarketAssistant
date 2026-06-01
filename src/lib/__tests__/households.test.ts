import { describe, it, expect } from 'vitest'
import { computeDebts } from '../households'

const names: Record<string, string> = { a: 'Ana', b: 'Beto', c: 'Carla' }

describe('computeDebts (settle-up)', () => {
  it('caso simple: B debe 50 a A', () => {
    const debts = computeDebts({ a: 50, b: -50 }, names)
    expect(debts).toHaveLength(1)
    expect(debts[0]).toMatchObject({ from: 'b', to: 'a', amount: 50 })
    expect(debts[0].from_name).toBe('Beto')
    expect(debts[0].to_name).toBe('Ana')
  })

  it('todo saldado: sin deudas', () => {
    expect(computeDebts({ a: 0, b: 0 }, names)).toHaveLength(0)
  })

  it('tres personas: dos deudores pagan al acreedor', () => {
    const debts = computeDebts({ a: 30, b: -10, c: -20 }, names)
    const total = debts.reduce((s, d) => s + d.amount, 0)
    expect(total).toBeCloseTo(30, 2)
    // todo lo recibido por A debe sumar 30
    const recibidoA = debts.filter((d) => d.to === 'a').reduce((s, d) => s + d.amount, 0)
    expect(recibidoA).toBeCloseTo(30, 2)
  })

  it('ignora residuos por debajo de 1 céntimo', () => {
    expect(computeDebts({ a: 0.004, b: -0.004 }, names)).toHaveLength(0)
  })

  it('un acreedor recibe de varios y minimiza pagos', () => {
    const debts = computeDebts({ a: -40, b: 25, c: 15 }, names)
    // A debe 40 en total, repartido entre B (25) y C (15)
    const pagadoA = debts.filter((d) => d.from === 'a').reduce((s, d) => s + d.amount, 0)
    expect(pagadoA).toBeCloseTo(40, 2)
    expect(debts.length).toBeLessThanOrEqual(2)
  })
})
