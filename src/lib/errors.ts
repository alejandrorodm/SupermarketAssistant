// Extrae un mensaje legible de un error de tipo `unknown` (catch).
export function getErrorMessage(error: unknown, fallback = 'Ha ocurrido un error.'): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return fallback
}
