import { describe, it, expect } from 'vitest'
import { computeStreak, computeAchievements, type AchievementInput } from '../goals'
import type { MonthlyPoint } from '../stats'

const trend = (totals: number[]): MonthlyPoint[] =>
  totals.map((total, i) => ({ key: `m${i}`, label: `m${i}`, total }))

describe('computeStreak', () => {
  it('cuenta meses consecutivos dentro de presupuesto desde el final', () => {
    expect(computeStreak(trend([90, 80, 70]), 100)).toBe(3)
  })

  it('se corta cuando un mes se pasa', () => {
    expect(computeStreak(trend([120, 80, 70]), 100)).toBe(2)
    expect(computeStreak(trend([80, 120, 70]), 100)).toBe(1)
  })

  it('el último mes pasado de presupuesto rompe la racha', () => {
    expect(computeStreak(trend([80, 70, 120]), 100)).toBe(0)
  })

  it('un mes actual sin actividad no rompe la racha previa', () => {
    expect(computeStreak(trend([80, 70, 0]), 100)).toBe(2)
  })

  it('sin presupuesto no hay racha', () => {
    expect(computeStreak(trend([90, 80, 70]), null)).toBe(0)
  })
})

describe('computeAchievements', () => {
  const base: AchievementInput = {
    numTickets: 0,
    numSupermercados: 0,
    budget: null,
    gastoMesActual: 0,
    streak: 0,
    savingsGoal: null,
    ahorroMesActual: 0,
  }
  const get = (input: AchievementInput, id: string) =>
    computeAchievements(input).find((a) => a.id === id)!

  it('desbloquea "primer paso" con 1 ticket', () => {
    expect(get({ ...base, numTickets: 1 }, 'first-ticket').unlocked).toBe(true)
    expect(get(base, 'first-ticket').unlocked).toBe(false)
  })

  it('"en verde" requiere terminar el mes dentro de presupuesto', () => {
    expect(get({ ...base, budget: 100, gastoMesActual: 80 }, 'under-budget').unlocked).toBe(true)
    expect(get({ ...base, budget: 100, gastoMesActual: 120 }, 'under-budget').unlocked).toBe(false)
  })

  it('"meta cumplida" compara ahorro con la meta', () => {
    expect(get({ ...base, savingsGoal: 50, ahorroMesActual: 60 }, 'goal-reached').unlocked).toBe(true)
    expect(get({ ...base, savingsGoal: 50, ahorroMesActual: 40 }, 'goal-reached').unlocked).toBe(false)
  })

  it('logros bloqueados muestran pista útil', () => {
    expect(get(base, 'under-budget').hint).toBe('Define un presupuesto mensual')
  })
})
