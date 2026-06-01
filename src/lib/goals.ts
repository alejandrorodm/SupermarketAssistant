// Metas de ahorro y logros (gamificación), persistido localmente por usuario.
// Se deriva de los datos existentes; no requiere cambios en Supabase.
import type { MonthlyPoint } from './stats'

const GOAL_PREFIX = 'ts-savings-goal:'

export function getSavingsGoal(userId: string): number | null {
  try {
    const raw = localStorage.getItem(GOAL_PREFIX + userId)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function setSavingsGoal(userId: string, amount: number | null): void {
  try {
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      localStorage.removeItem(GOAL_PREFIX + userId)
    } else {
      localStorage.setItem(GOAL_PREFIX + userId, String(amount))
    }
  } catch {
    // ignore
  }
}

/**
 * Racha de meses consecutivos (terminando en el más reciente con actividad)
 * en los que el gasto se mantuvo dentro del presupuesto.
 * Requiere presupuesto definido; si no, devuelve 0.
 */
export function computeStreak(trend: MonthlyPoint[], budget: number | null): number {
  if (!budget || budget <= 0) return 0
  let streak = 0
  for (let i = trend.length - 1; i >= 0; i--) {
    const total = trend[i].total
    if (total <= 0) {
      // Mes sin actividad: si aún no hemos empezado la racha, lo saltamos;
      // si ya estábamos contando, lo cortamos (no podemos afirmar ahorro).
      if (streak === 0) continue
      break
    }
    if (total <= budget) streak++
    else break
  }
  return streak
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string // nombre del icono lucide (se resuelve en la página)
  unlocked: boolean
  hint?: string // pista cuando está bloqueado
}

export interface AchievementInput {
  numTickets: number
  numSupermercados: number
  budget: number | null
  gastoMesActual: number
  streak: number
  savingsGoal: number | null
  ahorroMesActual: number // max(0, budget - gasto) si hay presupuesto
}

export function computeAchievements(i: AchievementInput): Achievement[] {
  const underBudget = i.budget != null && i.gastoMesActual > 0 && i.gastoMesActual <= i.budget
  const needBudgetHint = i.budget == null ? 'Define un presupuesto mensual' : undefined

  return [
    {
      id: 'first-ticket',
      title: 'Primer paso',
      description: 'Escanea tu primer ticket',
      icon: 'Footprints',
      unlocked: i.numTickets >= 1,
    },
    {
      id: 'ten-tickets',
      title: 'Coleccionista',
      description: 'Escanea 10 tickets',
      icon: 'Receipt',
      unlocked: i.numTickets >= 10,
      hint: i.numTickets < 10 ? `${i.numTickets}/10 tickets` : undefined,
    },
    {
      id: 'fifty-tickets',
      title: 'Veterano',
      description: 'Escanea 50 tickets',
      icon: 'Award',
      unlocked: i.numTickets >= 50,
      hint: i.numTickets < 50 ? `${i.numTickets}/50 tickets` : undefined,
    },
    {
      id: 'explorer',
      title: 'Explorador',
      description: 'Compra en 3 supermercados distintos',
      icon: 'Map',
      unlocked: i.numSupermercados >= 3,
      hint: i.numSupermercados < 3 ? `${i.numSupermercados}/3 supermercados` : undefined,
    },
    {
      id: 'under-budget',
      title: 'En verde',
      description: 'Termina un mes dentro del presupuesto',
      icon: 'PiggyBank',
      unlocked: underBudget,
      hint: needBudgetHint,
    },
    {
      id: 'streak-3',
      title: 'Racha de 3',
      description: '3 meses seguidos dentro del presupuesto',
      icon: 'Flame',
      unlocked: i.streak >= 3,
      hint: needBudgetHint ?? (i.streak < 3 ? `Racha actual: ${i.streak}` : undefined),
    },
    {
      id: 'goal-reached',
      title: 'Meta cumplida',
      description: 'Alcanza tu meta de ahorro del mes',
      icon: 'Target',
      unlocked: i.savingsGoal != null && i.ahorroMesActual >= i.savingsGoal,
      hint:
        i.savingsGoal == null
          ? 'Define una meta de ahorro'
          : `${i.ahorroMesActual.toFixed(0)}€/${i.savingsGoal.toFixed(0)}€ ahorrados`,
    },
  ]
}
