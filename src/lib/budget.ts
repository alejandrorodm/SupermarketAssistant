// Presupuestos del usuario (mensual y semanal), persistidos localmente por usuario.
// Se mantienen en localStorage para no requerir cambios de esquema en Supabase.

const KEY_PREFIX = 'ts-budget:' // mensual (clave histórica, no se renombra)
const WEEKLY_PREFIX = 'ts-budget-weekly:'

export type BudgetPeriod = 'monthly' | 'weekly'

export interface Budgets {
  monthly: number | null
  weekly: number | null
}

function readBudget(key: string): number | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function writeBudget(key: string, amount: number | null): void {
  try {
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, String(amount))
    }
  } catch {
    // ignore
  }
}

/** Presupuesto mensual (compatibilidad con el código existente). */
export function getBudget(userId: string): number | null {
  return readBudget(KEY_PREFIX + userId)
}

export function setBudget(userId: string, amount: number | null): void {
  writeBudget(KEY_PREFIX + userId, amount)
}

/** Presupuesto semanal. */
export function getWeeklyBudget(userId: string): number | null {
  return readBudget(WEEKLY_PREFIX + userId)
}

export function setWeeklyBudget(userId: string, amount: number | null): void {
  writeBudget(WEEKLY_PREFIX + userId, amount)
}

/** Ambos presupuestos de una vez. */
export function getBudgets(userId: string): Budgets {
  return { monthly: getBudget(userId), weekly: getWeeklyBudget(userId) }
}
