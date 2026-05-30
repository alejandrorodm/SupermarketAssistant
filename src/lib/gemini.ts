import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

if (!GEMINI_API_KEY || GEMINI_API_KEY === 'tu_gemini_api_key_aqui') {
  console.warn('Falta la variable de entorno VITE_GEMINI_API_KEY')
}

// Inicializar el SDK de Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'placeholder')

// Seleccionar el modelo Flash más reciente
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' })

const SYSTEM_PROMPT = `
Actúa como un extractor de datos OCR ultra preciso para tickets de supermercados españoles. Analiza la imagen del ticket adjunto.
Debes identificar el supermercado (ej. Mercadona, Carrefour, Dia, Lidl), la fecha de la compra (formato YYYY-MM-DD), el importe total y desglosar cada artículo.
Para cada artículo, limpia las abreviaturas extrañas si es posible (ej: "PROT S/LACT VNL" -> "Yogur Proteína Vainilla Sin Lactosa") y asígnale una de las siguientes categorías estrictas: [Proteínas, Carbohidratos, Frutas y Verduras, Lácteos, Limpieza y Hogar, Caprichos, Otros].

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

export async function procesarTicketConGemini(base64Image: string, mimeType: string): Promise<TicketData> {
  try {
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      {
        inlineData: {
          data: base64Image,
          mimeType
        }
      }
    ])

    const response = await result.response
    let text = response.text()
    
    // Limpiar posibles bloques de markdown en caso de que la IA los devuelva
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()
    
    return JSON.parse(text) as TicketData
  } catch (error) {
    console.error('Error procesando ticket con Gemini:', error)
    throw new Error('No se pudo extraer la información del ticket. Revisa la imagen e inténtalo de nuevo.')
  }
}
