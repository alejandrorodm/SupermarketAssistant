import { supabase } from './supabase'
import { getErrorMessage } from './errors'
import { addPurchaseToInventory } from './inventory'
import type { TicketData } from './gemini'
import type { SplitMode } from './households'

export interface TicketHouseholdOptions {
  householdId?: string | null
  paidBy?: string | null
  splitMode?: SplitMode
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mimeType })
}

export async function guardarTicketEnSupabase(
  ticketData: TicketData,
  base64Image: string,
  userId: string,
  household?: TicketHouseholdOptions,
): Promise<string> {
  try {
    let ticketImageUrl = null

    // 1. Subir imagen a Storage (opcional, si hay bucket creado)
    if (base64Image) {
      try {
        const [header, base64] = base64Image.split(',')
        const mimeType = header.split(':')[1].split(';')[0]
        const blob = base64ToBlob(base64, mimeType)
        const ext = mimeType.split('/')[1]
        const fileName = `${userId}/${Date.now()}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('ticket_images')
          .upload(fileName, blob, {
            contentType: mimeType,
            upsert: false
          })

        if (uploadError) {
          console.warn('Error subiendo imagen. ¿Está creado el bucket "ticket_images"?', uploadError)
        } else if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('ticket_images')
            .getPublicUrl(uploadData.path)
          
          ticketImageUrl = publicUrl
        }
      } catch (err) {
        console.warn('Error procesando imagen para storage:', err)
      }
    }

    // 2. Insertar ticket principal
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        user_id: userId,
        supermercado: ticketData.supermercado,
        fecha: ticketData.fecha,
        total: ticketData.total,
        ticket_image_url: ticketImageUrl,
        household_id: household?.householdId ?? null,
        paid_by: household?.householdId ? household?.paidBy ?? userId : null,
        split_mode: household?.householdId ? household?.splitMode ?? 'shared' : 'personal',
      })
      .select('id')
      .single()

    if (ticketError) throw ticketError
    const ticketId = ticket.id

    // 3. Insertar items
    const itemsToInsert = ticketData.items.map(item => ({
      ticket_id: ticketId,
      producto_nombre: item.producto_nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      categoria: item.categoria
    }))

    const { error: itemsError } = await supabase
      .from('ticket_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    // 4. Alimentar la despensa con lo comprado (no bloquea si falla).
    await addPurchaseToInventory(
      ticketData.items.map((item) => ({
        producto_nombre: item.producto_nombre,
        categoria: item.categoria,
        cantidad: item.cantidad,
      })),
      { userId, householdId: household?.householdId ?? null },
    )

    return ticketId
  } catch (error) {
    console.error('Error guardando ticket completo:', error)
    throw new Error(getErrorMessage(error, 'Error al guardar el ticket en la base de datos.'), {
      cause: error,
    })
  }
}

/**
 * Elimina un ticket y todos sus items. Borramos los items primero por si la
 * relación no tiene ON DELETE CASCADE configurado en la base de datos.
 */
export async function eliminarTicket(ticketId: string): Promise<void> {
  try {
    const { error: itemsError } = await supabase
      .from('ticket_items')
      .delete()
      .eq('ticket_id', ticketId)
    if (itemsError) throw itemsError

    const { error: ticketError } = await supabase
      .from('tickets')
      .delete()
      .eq('id', ticketId)
    if (ticketError) throw ticketError
  } catch (error) {
    console.error('Error eliminando ticket:', error)
    throw new Error(getErrorMessage(error, 'No se pudo eliminar el ticket.'), { cause: error })
  }
}

/**
 * Actualiza la cabecera del ticket y reemplaza por completo su lista de items.
 */
export async function actualizarTicketEnSupabase(
  ticketId: string,
  ticketData: TicketData,
): Promise<void> {
  try {
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        supermercado: ticketData.supermercado,
        fecha: ticketData.fecha,
        total: ticketData.total,
      })
      .eq('id', ticketId)
    if (updateError) throw updateError

    // Reemplazar items: borrar los existentes e insertar los nuevos
    const { error: delError } = await supabase
      .from('ticket_items')
      .delete()
      .eq('ticket_id', ticketId)
    if (delError) throw delError

    const itemsToInsert = ticketData.items.map((item) => ({
      ticket_id: ticketId,
      producto_nombre: item.producto_nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      categoria: item.categoria,
    }))

    if (itemsToInsert.length > 0) {
      const { error: insError } = await supabase.from('ticket_items').insert(itemsToInsert)
      if (insError) throw insError
    }
  } catch (error) {
    console.error('Error actualizando ticket:', error)
    throw new Error(getErrorMessage(error, 'No se pudo actualizar el ticket.'), { cause: error })
  }
}
