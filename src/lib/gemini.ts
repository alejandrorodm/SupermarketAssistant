import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'tu_gemini_api_key_aqui') {
  console.warn('Falta la variable de entorno VITE_GEMINI_API_KEY')
}

// Inicializar el SDK de Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'placeholder')

// Modelo Flash más reciente disponible (rápido y multimodal)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

// Categorías estrictas usadas en toda la app
export const CATEGORIAS = [
  'Proteínas',
  'Carbohidratos',
  'Frutas y Verduras',
  'Lácteos',
  'Limpieza y Hogar',
  'Caprichos',
  'Otros',
] as const

const SYSTEM_PROMPT = `
Actúa como un extractor de datos OCR ultra preciso para tickets de supermercados españoles. Analiza la imagen del ticket adjunto.
Debes identificar el supermercado (ej. Mercadona, Carrefour, Dia, Lidl), la fecha de la compra (formato YYYY-MM-DD), el importe total y desglosar cada artículo.
Para cada artículo, limpia las abreviaturas extrañas si es posible (ej: "PROT S/LACT VNL" -> "Yogur Proteína Vainilla Sin Lactosa") y asígnale una de las siguientes categorías estrictas: [${CATEGORIAS.join(', ')}].

Devuelve EXCLUSIVAMENTE un objeto JSON con esta estructura, sin formato markdown, sin texto adicional:
{
  "supermercado": "Nombre",
  "fecha": "YYYY-MM-DD",
  "total": 0.00,
  "items": [
    {"producto_nombre": "Nombre limpio", "cantidad": 1, "precio_unitario": 0.00, "categoria": "Categoría"}
  ]
}
`

export interface TicketItem {
  producto_nombre: string
  cantidad: number
  precio_unitario: number
  categoria: string
}

export interface TicketData {
  supermercado: string
  fecha: string
  total: number
  items: TicketItem[]
}

function limpiarJSON(text: string): string {
  return text.replace(/```json/g, '').replace(/```/g, '').trim()
}

export async function procesarTicketConGemini(base64Image: string, mimeType: string): Promise<TicketData> {
  try {
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ])

    const response = await result.response
    const text = limpiarJSON(response.text())

    return JSON.parse(text) as TicketData
  } catch (error) {
    console.error('Error procesando ticket con Gemini:', error)
    throw new Error(
      'No se pudo extraer la información del ticket. Revisa la imagen e inténtalo de nuevo.',
      { cause: error },
    )
  }
}

export interface ProductoFrecuente {
  producto_nombre: string
  categoria: string
  veces: number
  precio_medio: number
}

export interface SugerenciaCompra {
  producto_nombre: string
  categoria: string
  motivo: string
  precio_estimado: number
}

export interface ListaCompraIA {
  sugerencias: SugerenciaCompra[]
  gasto_estimado: number
  consejo: string
}

/** Producto disponible en la despensa, usado para no sugerir lo que ya hay. */
export interface InventarioDisponible {
  producto_nombre: string
  cantidad: number
}

/**
 * Genera una lista de la compra inteligente a partir del historial de productos
 * más frecuentes del usuario, prediciendo el gasto aproximado. Si se le pasa el
 * inventario actual, evita sugerir lo que ya hay en la despensa y prioriza
 * reponer lo agotado.
 */
export async function generarListaCompraIA(
  productos: ProductoFrecuente[],
  inventario: InventarioDisponible[] = [],
): Promise<ListaCompraIA> {
  if (productos.length === 0) {
    throw new Error('Necesitas escanear algunos tickets antes de generar una lista inteligente.')
  }

  const bloqueInventario =
    inventario.length > 0
      ? `\n\nEl usuario YA TIENE estos productos en su despensa (no hace falta volver a comprarlos salvo que la cantidad sea muy baja):\n${inventario
          .map((i) => `- ${i.producto_nombre}: ${i.cantidad} en stock`)
          .join('\n')}\n\nNO incluyas en la lista los productos de los que ya haya stock suficiente; céntrate en lo que falta o se ha agotado.`
      : ''

  const prompt = `
Eres un asistente de compra de supermercado para un usuario español. A continuación tienes su historial de productos comprados con la frecuencia (número de veces que aparece) y el precio medio pagado en euros:

${productos
  .map((p) => `- ${p.producto_nombre} (${p.categoria}): comprado ${p.veces} veces, precio medio ${p.precio_medio.toFixed(2)}€`)
  .join('\n')}
${bloqueInventario}

Basándote en estos hábitos, genera una lista de la compra recomendada para la próxima visita al supermercado. Prioriza los productos más recurrentes (los básicos que probablemente necesite reponer) y equilibra las categorías. Incluye entre 8 y 15 productos.

Devuelve EXCLUSIVAMENTE un objeto JSON, sin markdown ni texto adicional, con esta estructura:
{
  "sugerencias": [
    {"producto_nombre": "Nombre", "categoria": "Una de [${CATEGORIAS.join(', ')}]", "motivo": "Breve razón (máx 6 palabras)", "precio_estimado": 0.00}
  ],
  "gasto_estimado": 0.00,
  "consejo": "Un consejo breve y útil de ahorro personalizado (máx 25 palabras)"
}
`

  try {
    const result = await model.generateContent(prompt)
    const text = limpiarJSON(result.response.text())
    return JSON.parse(text) as ListaCompraIA
  } catch (error) {
    console.error('Error generando lista de compra con IA:', error)
    throw new Error('No se pudo generar la lista inteligente. Inténtalo de nuevo en unos segundos.', {
      cause: error,
    })
  }
}
