// Utilidades de escaneo de tickets (lectura de imagen y troceado del data URL).

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5 MB

export function isImageTooLarge(size: number): boolean {
  return size > MAX_IMAGE_BYTES
}

/**
 * Separa un data URL (`data:image/jpeg;base64,XXXX`) en su mimeType y su base64.
 */
export function splitDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const [header, base64] = dataUrl.split(',')
  if (!header || base64 === undefined) {
    throw new Error('Imagen no válida.')
  }
  const mimeType = header.split(':')[1]?.split(';')[0] || 'image/jpeg'
  return { base64, mimeType }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.readAsDataURL(file)
  })
}
