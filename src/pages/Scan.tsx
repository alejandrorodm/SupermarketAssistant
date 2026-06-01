import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../lib/errors'
import { Camera, Image as ImageIcon, Loader2, X, ChevronLeft, Images } from 'lucide-react'
import { procesarTicketConGemini } from '../lib/gemini'
import { isImageTooLarge, splitDataUrl } from '../lib/scan'

export function Scan() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isImageTooLarge(file.size)) {
      setError('La imagen es demasiado grande. Máximo 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      setImageSrc(reader.result as string)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleProcessTicket = async () => {
    if (!imageSrc) return

    setIsProcessing(true)
    setError(null)

    try {
      // imageSrc tiene el formato: data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...
      const { base64, mimeType } = splitDataUrl(imageSrc)

      const data = await procesarTicketConGemini(base64, mimeType)
      
      // Al procesar con éxito, pasamos los datos a la página de revisión
      navigate('/review', { state: { ticketData: data, imageSrc } })

    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsProcessing(false)
    }
  }

  const clearImage = () => {
    setImageSrc(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col pb-safe">
      {/* Header Modal */}
      <header className="bg-white dark:bg-slate-800 shadow-sm px-4 py-4 flex items-center sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)} 
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mr-2"
        >
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Escanear Ticket</h1>
      </header>

      <main className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full">
        {!imageSrc ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Nuevo Ticket</h2>
              <p className="text-slate-500 dark:text-slate-400">Sube una foto clara de tu recibo para extraer los productos automáticamente.</p>
            </div>

            <div className="w-full space-y-4 mt-8">
              {/* Botón para Cámara (capture="environment" fuerza la cámara trasera en móviles) */}
              <label className="relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-5 text-lg font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition-all">
                <Camera size={24} />
                Hacer Foto
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">o</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-700"></div>
              </div>

              {/* Botón para Galería */}
              <label className="relative flex w-full cursor-pointer items-center justify-center gap-3 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 px-8 py-4 text-lg font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 active:scale-95 transition-all">
                <ImageIcon size={24} />
                Subir de la galería
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <button
                onClick={() => navigate('/scan/batch')}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1"
              >
                <Images size={16} />
                ¿Tienes varios? Escanéalos a la vez
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 border border-red-200 rounded-xl text-center">
                {error}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="relative flex-1 bg-black rounded-2xl overflow-hidden mb-6 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <img 
                src={imageSrc} 
                alt="Ticket preview" 
                className={`max-h-full max-w-full object-contain ${isProcessing ? 'opacity-50 blur-sm' : ''} transition-all`}
              />
              
              {!isProcessing && (
                <button 
                  onClick={clearImage}
                  className="absolute top-4 right-4 bg-slate-900/60 text-white p-2 rounded-full backdrop-blur-sm hover:bg-red-500/80 transition-colors"
                >
                  <X size={24} />
                </button>
              )}

              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
                  <p className="font-medium text-lg drop-shadow-md">Extrayendo datos con IA...</p>
                  <p className="text-sm opacity-80 mt-1 drop-shadow-md">Esto puede tardar unos segundos</p>
                </div>
              )}
            </div>

            {error && (
              <div className="mb-6 p-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 border border-red-200 rounded-xl text-center">
                {error}
              </div>
            )}

            <button
              onClick={handleProcessTicket}
              disabled={isProcessing}
              className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-lg shadow-lg hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>Procesando...</>
              ) : (
                <>Extraer Datos del Ticket</>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
