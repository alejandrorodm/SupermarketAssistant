import { supabase } from './supabase'
import { getBudgets } from './budget'
import { getDashboardStats } from './stats'

export type NotificationKind = 'budget' | 'household'
export type BudgetLevel = 'near' | 'over'

export interface AppNotification {
  id: string
  kind: NotificationKind
  level?: BudgetLevel
  title: string
  body: string
  ts: string // ISO
}

// Umbral para el aviso de "te acercas al presupuesto".
export const NEAR_BUDGET_RATIO = 0.8

export interface PeriodSpend {
  spent: number
  budget: number | null
}

/**
 * Lógica pura: a partir del gasto y presupuesto de cada periodo, construye los
 * avisos de presupuesto (cercano o superado). `now` se inyecta para los tests.
 */
export function buildBudgetNotifications(
  input: { weekly: PeriodSpend; monthly: PeriodSpend },
  now: string,
): AppNotification[] {
  const out: AppNotification[] = []
  const periodos: { key: 'weekly' | 'monthly'; etiqueta: string; data: PeriodSpend }[] = [
    { key: 'weekly', etiqueta: 'semanal', data: input.weekly },
    { key: 'monthly', etiqueta: 'mensual', data: input.monthly },
  ]

  for (const { key, etiqueta, data } of periodos) {
    const { spent, budget } = data
    if (!budget || budget <= 0) continue
    if (spent > budget) {
      out.push({
        id: `budget-${key}-over`,
        kind: 'budget',
        level: 'over',
        title: `Presupuesto ${etiqueta} superado`,
        body: `Llevas ${spent.toFixed(2)}€ de ${budget.toFixed(2)}€ (${(spent - budget).toFixed(2)}€ de más).`,
        ts: now,
      })
    } else if (spent / budget >= NEAR_BUDGET_RATIO) {
      out.push({
        id: `budget-${key}-near`,
        kind: 'budget',
        level: 'near',
        title: `Cerca del presupuesto ${etiqueta}`,
        body: `Llevas ${spent.toFixed(2)}€ de ${budget.toFixed(2)}€. Te quedan ${(budget - spent).toFixed(2)}€.`,
        ts: now,
      })
    }
  }
  return out
}

interface TicketEventRow {
  id: string
  user_id: string
  household_id: string | null
  supermercado: string | null
  total: number
  created_at: string
}

/**
 * Tickets subidos por OTROS miembros de mis hogares desde `sinceISO`.
 * Devuelve notificaciones listas para mostrar.
 */
export async function getHouseholdTicketEvents(
  userId: string,
  householdNames: Record<string, string>,
  sinceISO: string,
): Promise<AppNotification[]> {
  const householdIds = Object.keys(householdNames)
  if (householdIds.length === 0) return []

  const { data, error } = await supabase
    .from('tickets')
    .select('id, user_id, household_id, supermercado, total, created_at')
    .in('household_id', householdIds)
    .neq('user_id', userId)
    .gt('created_at', sinceISO)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error

  const rows = (data as TicketEventRow[]) || []
  if (rows.length === 0) return []

  // Resolver nombres de quién subió cada ticket.
  const autorIds = [...new Set(rows.map((r) => r.user_id))]
  const { data: perfiles } = await supabase
    .from('profiles')
    .select('id, display_name, email')
    .in('id', autorIds)
  const nombrePorId: Record<string, string> = {}
  for (const p of (perfiles as { id: string; display_name: string | null; email: string | null }[]) || []) {
    nombrePorId[p.id] = (p.display_name || '').trim() || (p.email || '').split('@')[0] || 'Alguien'
  }

  return rows.map((r) => {
    const autor = nombrePorId[r.user_id] || 'Alguien'
    const hogar = (r.household_id && householdNames[r.household_id]) || 'el hogar'
    return {
      id: `ticket-${r.id}`,
      kind: 'household' as const,
      title: `Nuevo ticket en «${hogar}»`,
      body: `${autor} añadió ${r.supermercado || 'una compra'} · ${Number(r.total).toFixed(2)}€`,
      ts: r.created_at,
    }
  })
}

export interface LoadNotificationsParams {
  userId: string
  activeHouseholdId: string | null
  /** Mapa id→nombre de todos los hogares del usuario. */
  householdNames: Record<string, string>
  /** Momento actual en ISO (los avisos de presupuesto lo usan como ts). */
  now: string
  /** Solo se miran eventos del hogar desde esta fecha (ventana de avisos). */
  sinceISO: string
}

/** Carga todas las notificaciones (presupuesto + tickets del hogar). */
export async function loadNotifications(params: LoadNotificationsParams): Promise<AppNotification[]> {
  const { userId, activeHouseholdId, householdNames, now, sinceISO } = params

  const budgets = getBudgets(userId)
  const budgetNotifs: AppNotification[] = []
  if (budgets.weekly || budgets.monthly) {
    try {
      const stats = await getDashboardStats(userId, activeHouseholdId)
      budgetNotifs.push(
        ...buildBudgetNotifications(
          {
            weekly: { spent: stats.gastoSemana, budget: budgets.weekly },
            monthly: { spent: stats.totalGastado, budget: budgets.monthly },
          },
          now,
        ),
      )
    } catch (err) {
      console.warn('No se pudieron calcular avisos de presupuesto:', err)
    }
  }

  let householdNotifs: AppNotification[] = []
  try {
    householdNotifs = await getHouseholdTicketEvents(userId, householdNames, sinceISO)
  } catch (err) {
    console.warn('No se pudieron cargar los tickets del hogar:', err)
  }

  // Presupuesto primero (estado actual), luego los eventos por fecha desc.
  householdNotifs.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
  return [...budgetNotifs, ...householdNotifs]
}

// ---- Estado "visto" (badge de no leídas), por usuario en localStorage --------

const SEEN_PREFIX = 'ts-notif-seen:'

export interface SeenState {
  ts: string // última vez que se marcó como visto
  budgetIds: string[] // avisos de presupuesto ya vistos en ese momento
}

export function getSeenState(userId: string): SeenState {
  try {
    const raw = localStorage.getItem(SEEN_PREFIX + userId)
    if (raw) return JSON.parse(raw) as SeenState
  } catch {
    // ignore
  }
  // Por defecto: hace 14 días, sin presupuestos vistos.
  const def = new Date()
  def.setDate(def.getDate() - 14)
  return { ts: def.toISOString(), budgetIds: [] }
}

export function setSeenState(userId: string, items: AppNotification[], now: string): void {
  const budgetIds = items.filter((i) => i.kind === 'budget').map((i) => i.id)
  try {
    localStorage.setItem(SEEN_PREFIX + userId, JSON.stringify({ ts: now, budgetIds }))
  } catch {
    // ignore
  }
}

/**
 * Lógica pura: cuántas notificaciones cuentan como "no leídas" dado el estado
 * visto. Los eventos del hogar cuentan si son posteriores a `seen.ts`; los
 * avisos de presupuesto, si su id no estaba ya visto.
 */
export function countUnread(items: AppNotification[], seen: SeenState): number {
  const seenBudget = new Set(seen.budgetIds)
  const seenTime = new Date(seen.ts).getTime()
  return items.filter((i) =>
    i.kind === 'budget' ? !seenBudget.has(i.id) : new Date(i.ts).getTime() > seenTime,
  ).length
}
