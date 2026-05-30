import { supabase } from './supabase'
import type { TicketData } from './gemini'

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
  userId: string
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
        ticket_image_url: ticketImageUrl
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

    return ticketId
  } catch (error: any) {
    console.error('Error guardando ticket completo:', error)
    throw new Error(error.message || 'Error al guardar el ticket en la base de datos.')
  }
}
