import { supabase } from './supabase'

// ----------------------------------------------------------------------------
// Tipos
// ----------------------------------------------------------------------------
export interface Household {
  id: string
  name: string
  created_by: string
  created_at: string
  role?: string
}

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
}

export interface HouseholdMember {
  user_id: string
  role: string
  joined_at: string
  display_name: string
  email: string | null
}

export interface PendingInvite {
  id: string
  household_id: string
  household_name: string
  invited_by_name: string
  created_at: string
}

export interface HouseholdInvite {
  id: string
  email: string
  status: string
  created_at: string
}

export interface Settlement {
  id: string
  household_id: string
  from_user: string
  to_user: string
  from_name: string
  to_name: string
  amount: number
  note: string | null
  created_at: string
}

export type SplitMode = 'personal' | 'shared'

export interface Debt {
  from: string // userId que debe
  to: string // userId al que se le debe
  from_name: string
  to_name: string
  amount: number
}

export interface BalanceResult {
  // saldo neto por usuario: > 0 le deben, < 0 debe
  net: Record<string, number>
  names: Record<string, string>
  debts: Debt[]
  totalCompartido: number
}

// ----------------------------------------------------------------------------
// Hogar activo (persistido en localStorage por usuario)
// ----------------------------------------------------------------------------
const activeKey = (userId: string) => `ts-active-household:${userId}`

export function getActiveHouseholdId(userId: string): string | null {
  return localStorage.getItem(activeKey(userId))
}

export function setActiveHouseholdId(userId: string, householdId: string | null) {
  if (householdId) localStorage.setItem(activeKey(userId), householdId)
  else localStorage.removeItem(activeKey(userId))
}

// ----------------------------------------------------------------------------
// Helpers internos
// ----------------------------------------------------------------------------
async function getProfilesMap(userIds: string[]): Promise<Record<string, Profile>> {
  const ids = Array.from(new Set(userIds)).filter(Boolean)
  if (ids.length === 0) return {}
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .in('id', ids)
  if (error) throw error
  const map: Record<string, Profile> = {}
  ;(data || []).forEach((p) => {
    map[p.id] = p as Profile
  })
  return map
}

function nameOf(map: Record<string, Profile>, userId: string): string {
  const p = map[userId]
  return p?.display_name || p?.email?.split('@')[0] || 'Usuario'
}

// ----------------------------------------------------------------------------
// Hogares y miembros
// ----------------------------------------------------------------------------
export async function getMyHouseholds(): Promise<Household[]> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return []

  const { data: memberships, error: mErr } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', uid)
  if (mErr) throw mErr
  if (!memberships || memberships.length === 0) return []

  const roleById: Record<string, string> = {}
  memberships.forEach((m) => { roleById[m.household_id] = m.role })

  const { data: households, error: hErr } = await supabase
    .from('households')
    .select('id, name, created_by, created_at')
    .in('id', Object.keys(roleById))
    .order('created_at', { ascending: true })
  if (hErr) throw hErr

  return (households || []).map((h) => ({ ...h, role: roleById[h.id] }))
}

export async function createHousehold(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_household', { p_name: name })
  if (error) throw new Error(error.message || 'No se pudo crear el hogar')
  return data as string
}

export async function deleteHousehold(householdId: string): Promise<void> {
  const { error } = await supabase.from('households').delete().eq('id', householdId)
  if (error) throw error
}

export async function getMembers(householdId: string): Promise<HouseholdMember[]> {
  const { data, error } = await supabase
    .from('household_members')
    .select('user_id, role, joined_at')
    .eq('household_id', householdId)
    .order('joined_at', { ascending: true })
  if (error) throw error

  const profiles = await getProfilesMap((data || []).map((m) => m.user_id))
  return (data || []).map((m) => ({
    user_id: m.user_id,
    role: m.role,
    joined_at: m.joined_at,
    display_name: nameOf(profiles, m.user_id),
    email: profiles[m.user_id]?.email ?? null,
  }))
}

export async function leaveHousehold(householdId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeMember(householdId: string, userId: string): Promise<void> {
  return leaveHousehold(householdId, userId)
}

// ----------------------------------------------------------------------------
// Invitaciones
// ----------------------------------------------------------------------------
export async function inviteToHousehold(householdId: string, email: string): Promise<void> {
  const { error } = await supabase.rpc('invite_to_household', {
    p_household_id: householdId,
    p_email: email,
  })
  if (error) throw new Error(error.message || 'No se pudo enviar la invitación')
}

/** Invitaciones pendientes dirigidas al usuario actual (por su email). */
export async function getPendingInvitesForMe(): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from('household_invites')
    .select('id, household_id, invited_by, created_at')
    .eq('status', 'pending')
  if (error) throw error
  if (!data || data.length === 0) return []

  const households = await supabase
    .from('households')
    .select('id, name')
    .in('id', data.map((i) => i.household_id))
  const nameById: Record<string, string> = {}
  ;(households.data || []).forEach((h) => { nameById[h.id] = h.name })

  const profiles = await getProfilesMap(data.map((i) => i.invited_by))

  return data.map((i) => ({
    id: i.id,
    household_id: i.household_id,
    household_name: nameById[i.household_id] || 'Hogar',
    invited_by_name: nameOf(profiles, i.invited_by),
    created_at: i.created_at,
  }))
}

/** Invitaciones pendientes de un hogar (vista de gestión). */
export async function getHouseholdInvites(householdId: string): Promise<HouseholdInvite[]> {
  const { data, error } = await supabase
    .from('household_invites')
    .select('id, email, status, created_at')
    .eq('household_id', householdId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []) as HouseholdInvite[]
}

export async function acceptInvite(inviteId: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_invite', { p_invite_id: inviteId })
  if (error) throw new Error(error.message || 'No se pudo aceptar la invitación')
  return data as string
}

export async function cancelInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.from('household_invites').delete().eq('id', inviteId)
  if (error) throw error
}

// ----------------------------------------------------------------------------
// Settlements (Bizums entre miembros)
// ----------------------------------------------------------------------------
export async function getSettlements(householdId: string): Promise<Settlement[]> {
  const { data, error } = await supabase
    .from('household_settlements')
    .select('id, household_id, from_user, to_user, amount, note, created_at')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!data || data.length === 0) return []

  const profiles = await getProfilesMap(data.flatMap((s) => [s.from_user, s.to_user]))
  return data.map((s) => ({
    ...s,
    amount: Number(s.amount),
    from_name: nameOf(profiles, s.from_user),
    to_name: nameOf(profiles, s.to_user),
  }))
}

export async function addSettlement(
  householdId: string,
  fromUser: string,
  toUser: string,
  amount: number,
  note?: string,
): Promise<void> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  const { error } = await supabase.from('household_settlements').insert({
    household_id: householdId,
    from_user: fromUser,
    to_user: toUser,
    amount,
    note: note || null,
    created_by: uid,
  })
  if (error) throw error
}

export async function deleteSettlement(id: string): Promise<void> {
  const { error } = await supabase.from('household_settlements').delete().eq('id', id)
  if (error) throw error
}

// ----------------------------------------------------------------------------
// Balance / settle-up (quién debe a quién)
// ----------------------------------------------------------------------------
/**
 * Convierte saldos netos en una lista mínima de pagos (greedy settle-up).
 * net > 0 => le deben; net < 0 => debe.
 */
function computeDebts(
  net: Record<string, number>,
  names: Record<string, string>,
): Debt[] {
  const EPS = 0.01
  const creditors = Object.entries(net)
    .filter(([, v]) => v > EPS)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount)
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -EPS)
    .map(([id, v]) => ({ id, amount: -v }))
    .sort((a, b) => b.amount - a.amount)

  const debts: Debt[] = []
  let i = 0
  let j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount)
    if (pay > EPS) {
      debts.push({
        from: debtors[i].id,
        to: creditors[j].id,
        from_name: names[debtors[i].id] || 'Usuario',
        to_name: names[creditors[j].id] || 'Usuario',
        amount: Number(pay.toFixed(2)),
      })
    }
    debtors[i].amount -= pay
    creditors[j].amount -= pay
    if (debtors[i].amount <= EPS) i++
    if (creditors[j].amount <= EPS) j++
  }
  return debts
}

/**
 * Calcula el balance del hogar a partir de los tickets compartidos
 * (split_mode = 'shared') y los settlements registrados.
 */
export async function getHouseholdBalance(householdId: string): Promise<BalanceResult> {
  const members = await getMembers(householdId)
  const memberIds = members.map((m) => m.user_id)

  const net: Record<string, number> = {}
  const names: Record<string, string> = {}
  members.forEach((m) => {
    net[m.user_id] = 0
    names[m.user_id] = m.display_name
  })

  // 1) Tickets compartidos del hogar
  const { data: tickets, error: tErr } = await supabase
    .from('tickets')
    .select('total, paid_by, split_mode')
    .eq('household_id', householdId)
    .eq('split_mode', 'shared')
  if (tErr) throw tErr

  let totalCompartido = 0
  const n = memberIds.length || 1
  ;(tickets || []).forEach((t) => {
    const total = Number(t.total) || 0
    totalCompartido += total
    const share = total / n
    // cada miembro consume su parte
    memberIds.forEach((id) => { net[id] -= share })
    // quien pagó puso el total (si sigue siendo miembro)
    if (t.paid_by && net[t.paid_by] !== undefined) net[t.paid_by] += total
  })

  // 2) Settlements: from -> to por amount
  const { data: settlements, error: sErr } = await supabase
    .from('household_settlements')
    .select('from_user, to_user, amount')
    .eq('household_id', householdId)
  if (sErr) throw sErr
  ;(settlements || []).forEach((s) => {
    const amount = Number(s.amount) || 0
    if (net[s.from_user] !== undefined) net[s.from_user] += amount
    if (net[s.to_user] !== undefined) net[s.to_user] -= amount
  })

  // redondeo
  Object.keys(net).forEach((k) => { net[k] = Number(net[k].toFixed(2)) })

  return {
    net,
    names,
    debts: computeDebts(net, names),
    totalCompartido: Number(totalCompartido.toFixed(2)),
  }
}
