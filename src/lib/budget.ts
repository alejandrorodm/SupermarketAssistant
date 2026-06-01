// Presupuesto mensual del usuario, persistido localmente (por usuario).
// Se mantiene en localStorage para no requerir cambios de esquema en Supabase.

const KEY_PREFIX = 'ts-budget:'

export function getBudget(userId: string): number | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + userId)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function setBudget(userId: string, amount: number | null): void {
  try {
    if (amount === null || !Number.isFinite(amount) || amount <= 0) {
      localStorage.removeItem(KEY_PREFIX + userId)
    } else {
      localStorage.setItem(KEY_PREFIX + userId, String(amount))
    }
  } catch {
    // ignore
  }
}
