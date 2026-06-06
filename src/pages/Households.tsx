import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  Users,
  Plus,
  Mail,
  Check,
  Loader2,
  Crown,
  Trash2,
  LogOut,
  UserPlus,
  Scale,
  Home,
  Star,
  X,
} from 'lucide-react'
import { useUser } from '../hooks/useUser'
import { useHousehold } from '../contexts/HouseholdContext'
import { useToast } from '../contexts/ToastContext'
import { getErrorMessage } from '../lib/errors'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import {
  createHousehold,
  inviteToHousehold,
  getMembers,
  getHouseholdInvites,
  getPendingInvitesForMe,
  acceptInvite,
  cancelInvite,
  leaveHousehold,
  deleteHousehold,
  type HouseholdMember,
  type HouseholdInvite,
  type PendingInvite,
} from '../lib/households'

export function Households() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { households, active, setActive, homeId, setHome, refresh } = useHousehold()
  const toast = useToast()

  const [pending, setPending] = useState<PendingInvite[]>([])
  const [members, setMembers] = useState<HouseholdMember[]>([])
  const [invites, setInvites] = useState<HouseholdInvite[]>([])
  const [newName, setNewName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [confirm, setConfirm] = useState<{ kind: 'leave' | 'delete'; busy: boolean } | null>(null)

  const isOwner = active?.created_by === user?.id

  const loadActiveDetails = useCallback(async () => {
    if (!active) {
      setMembers([])
      setInvites([])
      return
    }
    try {
      const [m, inv] = await Promise.all([getMembers(active.id), getHouseholdInvites(active.id)])
      setMembers(m)
      setInvites(inv)
    } catch (err) {
      console.error(err)
    }
  }, [active])

  const loadPending = useCallback(async () => {
    try {
      setPending(await getPendingInvitesForMe())
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPending()
  }, [loadPending])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActiveDetails()
  }, [loadActiveDetails])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      const id = await createHousehold(newName.trim())
      setNewName('')
      await refresh()
      setActive(id)
      toast.success('Hogar creado.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo crear el hogar.'))
    } finally {
      setCreating(false)
    }
  }

  const handleInvite = async () => {
    if (!active || !inviteEmail.trim()) return
    setInviting(true)
    try {
      await inviteToHousehold(active.id, inviteEmail.trim())
      setInviteEmail('')
      await loadActiveDetails()
      toast.success('Invitación enviada.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo invitar.'))
    } finally {
      setInviting(false)
    }
  }

  const handleAccept = async (inviteId: string) => {
    try {
      const householdId = await acceptInvite(inviteId)
      await refresh()
      await loadPending()
      setActive(householdId)
      toast.success('Te has unido al hogar.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo aceptar la invitación.'))
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      await cancelInvite(inviteId)
      await loadActiveDetails()
      toast.info('Invitación cancelada.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cancelar.'))
    }
  }

  const handleConfirm = async () => {
    if (!active || !confirm) return
    setConfirm({ ...confirm, busy: true })
    try {
      if (confirm.kind === 'delete') {
        await deleteHousehold(active.id)
        toast.success('Hogar eliminado.')
      } else {
        await leaveHousehold(active.id, user!.id)
        toast.success('Has salido del hogar.')
      }
      setActive(null)
      await refresh()
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo completar la acción.'))
    } finally {
      setConfirm(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      <header className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg shadow-sm px-4 py-3.5 flex items-center sticky top-0 z-10 pt-safe">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-1 p-1"
        >
          <ChevronLeft size={26} />
        </button>
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Hogares</h1>
      </header>

      <main className="p-5 max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Invitaciones pendientes para mí */}
        {pending.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Invitaciones pendientes
            </h2>
            <div className="space-y-2">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {p.household_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Invitado por {p.invited_by_name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAccept(p.id)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Check size={16} /> Unirme
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Selector de hogar activo */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
            Tus hogares
          </h2>
          <p className="text-xs text-slate-400 mb-2 px-1">
            Toca para cambiar de vista. La <Star size={11} className="inline -mt-0.5 text-amber-500" />{' '}
            marca la pantalla que se abre al entrar.
          </p>
          <div className="space-y-2">
            {/* Modo personal */}
            <div
              className={`w-full bg-white dark:bg-slate-800 rounded-2xl border flex items-center transition-colors ${
                !active
                  ? 'border-blue-500 ring-1 ring-blue-500'
                  : 'border-slate-100 dark:border-slate-700'
              }`}
            >
              <button
                onClick={() => setActive(null)}
                className="flex-1 flex items-center gap-3 p-4 min-w-0"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0">
                  <Home size={18} />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    Personal
                    {homeId === 'personal' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Inicio
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">Solo tus tickets</p>
                </div>
                {!active && <Check size={20} className="text-blue-500 shrink-0" />}
              </button>
              <button
                onClick={() => setHome(null)}
                aria-label="Usar como pantalla de inicio"
                title="Usar como pantalla de inicio"
                className="p-4 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors"
              >
                <Star
                  size={20}
                  className={homeId === 'personal' ? 'text-amber-500 fill-amber-500' : ''}
                />
              </button>
            </div>

            {households.map((h) => (
              <div
                key={h.id}
                className={`w-full bg-white dark:bg-slate-800 rounded-2xl border flex items-center transition-colors ${
                  active?.id === h.id
                    ? 'border-blue-500 ring-1 ring-blue-500'
                    : 'border-slate-100 dark:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setActive(h.id)}
                  className="flex-1 flex items-center gap-3 p-4 min-w-0"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Users size={18} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                      <span className="truncate">{h.name}</span>
                      {homeId === h.id && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">
                          Inicio
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {h.created_by === user?.id ? 'Administrador' : 'Miembro'}
                    </p>
                  </div>
                  {active?.id === h.id && <Check size={20} className="text-blue-500 shrink-0" />}
                </button>
                <button
                  onClick={() => setHome(h.id)}
                  aria-label="Usar como pantalla de inicio"
                  title="Usar como pantalla de inicio"
                  className="p-4 text-slate-300 dark:text-slate-600 hover:text-amber-500 transition-colors"
                >
                  <Star size={20} className={homeId === h.id ? 'text-amber-500 fill-amber-500' : ''} />
                </button>
              </div>
            ))}
          </div>

          {/* Crear hogar */}
          <div className="mt-3 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Nombre del nuevo hogar"
              className="flex-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="px-4 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-500 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Crear
            </button>
          </div>
        </section>

        {/* Gestión del hogar activo */}
        {active && (
          <>
            <section>
              <div className="flex items-center justify-between gap-2 mb-2 px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 truncate min-w-0">
                  Miembros de «{active.name}»
                </h2>
                <button
                  onClick={() => navigate('/balance')}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 shrink-0"
                >
                  <Scale size={13} className="shrink-0" /> Ver balance
                </button>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 flex items-center justify-center shrink-0 text-sm font-bold uppercase">
                      {m.display_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        {m.display_name}
                        {m.user_id === user?.id && (
                          <span className="text-xs text-slate-400 font-normal">(tú)</span>
                        )}
                      </p>
                      {m.email && <p className="text-xs text-slate-400 truncate">{m.email}</p>}
                    </div>
                    {m.role === 'admin' && (
                      <span className="text-amber-500" title="Administrador">
                        <Crown size={16} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Invitar */}
            <section>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
                Invitar por email
              </h2>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  placeholder="email@ejemplo.com"
                  className="flex-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {inviting ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 px-1">
                La persona verá la invitación al iniciar sesión con ese email.
              </p>

              {invites.length > 0 && (
                <div className="mt-3 space-y-2">
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700 flex items-center gap-3"
                    >
                      <Mail size={16} className="text-slate-400 shrink-0" />
                      <p className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate">{inv.email}</p>
                      <span className="text-xs text-amber-500 font-medium">Pendiente</span>
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        aria-label="Cancelar invitación"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Salir / eliminar */}
            <section>
              {isOwner ? (
                <button
                  onClick={() => setConfirm({ kind: 'delete', busy: false })}
                  className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <Trash2 size={18} />
                  </div>
                  <span className="font-semibold">Eliminar hogar</span>
                </button>
              ) : (
                <button
                  onClick={() => setConfirm({ kind: 'leave', busy: false })}
                  className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <LogOut size={18} />
                  </div>
                  <span className="font-semibold">Salir del hogar</span>
                </button>
              )}
            </section>
          </>
        )}
      </main>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.kind === 'delete' ? 'Eliminar hogar' : 'Salir del hogar'}
        message={
          confirm?.kind === 'delete'
            ? 'Se eliminará el hogar y sus datos compartidos (miembros, invitaciones y balances). Los tickets no se borran, pero dejarán de estar compartidos. Esta acción no se puede deshacer.'
            : 'Dejarás de ver los tickets y el balance de este hogar.'
        }
        confirmLabel={confirm?.kind === 'delete' ? 'Eliminar' : 'Salir'}
        destructive
        loading={confirm?.busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
