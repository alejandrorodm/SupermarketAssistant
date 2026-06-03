import { describe, it, expect } from 'vitest'
import {
  buildBudgetNotifications,
  countUnread,
  type AppNotification,
  type SeenState,
} from '../notifications'

const NOW = '2026-06-03T12:00:00.000Z'

describe('buildBudgetNotifications', () => {
  it('no genera avisos sin presupuesto', () => {
    const out = buildBudgetNotifications(
      { weekly: { spent: 50, budget: null }, monthly: { spent: 200, budget: null } },
      NOW,
    )
    expect(out).toHaveLength(0)
  })

  it('no avisa cuando el gasto está holgado bajo el presupuesto', () => {
    const out = buildBudgetNotifications(
      { weekly: { spent: 10, budget: 100 }, monthly: { spent: 50, budget: 300 } },
      NOW,
    )
    expect(out).toHaveLength(0)
  })

  it('avisa "cerca" al alcanzar el 80%', () => {
    const out = buildBudgetNotifications(
      { weekly: { spent: 80, budget: 100 }, monthly: { spent: 100, budget: 300 } },
      NOW,
    )
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('budget-weekly-near')
    expect(out[0].level).toBe('near')
  })

  it('avisa "superado" al pasarse', () => {
    const out = buildBudgetNotifications(
      { weekly: { spent: 120, budget: 100 }, monthly: { spent: 50, budget: 300 } },
      NOW,
    )
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('budget-weekly-over')
    expect(out[0].level).toBe('over')
  })

  it('puede avisar de semanal y mensual a la vez', () => {
    const out = buildBudgetNotifications(
      { weekly: { spent: 120, budget: 100 }, monthly: { spent: 290, budget: 300 } },
      NOW,
    )
    expect(out.map((o) => o.id)).toEqual(['budget-weekly-over', 'budget-monthly-near'])
  })
})

describe('countUnread', () => {
  const seen: SeenState = { ts: '2026-06-01T00:00:00.000Z', budgetIds: ['budget-monthly-near'] }

  it('cuenta eventos de hogar posteriores a la última visita', () => {
    const items: AppNotification[] = [
      { id: 'ticket-1', kind: 'household', title: '', body: '', ts: '2026-06-02T10:00:00.000Z' },
      { id: 'ticket-2', kind: 'household', title: '', body: '', ts: '2026-05-30T10:00:00.000Z' },
    ]
    expect(countUnread(items, seen)).toBe(1)
  })

  it('cuenta avisos de presupuesto solo si su id no estaba visto', () => {
    const items: AppNotification[] = [
      { id: 'budget-monthly-near', kind: 'budget', level: 'near', title: '', body: '', ts: NOW },
      { id: 'budget-weekly-over', kind: 'budget', level: 'over', title: '', body: '', ts: NOW },
    ]
    // monthly-near ya visto, weekly-over es nuevo
    expect(countUnread(items, seen)).toBe(1)
  })

  it('combina hogar y presupuesto', () => {
    const items: AppNotification[] = [
      { id: 'ticket-1', kind: 'household', title: '', body: '', ts: '2026-06-02T10:00:00.000Z' },
      { id: 'budget-weekly-over', kind: 'budget', level: 'over', title: '', body: '', ts: NOW },
      { id: 'budget-monthly-near', kind: 'budget', level: 'near', title: '', body: '', ts: NOW },
    ]
    expect(countUnread(items, seen)).toBe(2)
  })
})
