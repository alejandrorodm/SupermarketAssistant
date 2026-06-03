import { supabase } from './supabase'
import { getErrorMessage } from './errors'

export interface Profile {
  id: string
  email: string | null
  display_name: string | null
}

/** Apodo a mostrar: display_name si lo hay, si no el usuario del email. */
export function displayNameOf(profile: Profile | null, fallbackEmail?: string | null): string {
  const name = profile?.display_name?.trim()
  if (name) return name
  const email = profile?.email || fallbackEmail || ''
  return email.split('@')[0] || 'Usuario'
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    return (data as Profile) ?? null
  } catch (error) {
    console.error('Error cargando el perfil:', error)
    return null
  }
}

export async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  try {
    const nombre = displayName.trim()
    if (!nombre) throw new Error('El apodo no puede estar vacío.')
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: nombre })
      .eq('id', userId)
    if (error) throw error
  } catch (error) {
    console.error('Error actualizando el apodo:', error)
    throw new Error(getErrorMessage(error, 'No se pudo guardar el apodo.'), { cause: error })
  }
}
