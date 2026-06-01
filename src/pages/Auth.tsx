import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Receipt, Mail, Lock, Loader2, ScanLine, Wallet, Sparkles } from 'lucide-react'
import { ThemeToggle } from '../components/ThemeToggle'

export function Auth() {
  const [isLoading, setIsLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Revisa tu correo para confirmar el registro.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error durante la autenticación')
    } finally {
      setIsLoading(false)
    }
  }

  const inputCls =
    'block w-full rounded-xl border-0 py-3 pl-10 pr-3 text-slate-900 dark:text-white bg-white dark:bg-slate-800 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm transition-shadow'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col px-6 py-10 lg:px-8 relative pt-safe">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="text-center animate-fade-in-up">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Receipt className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            TicketSaver
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {isLogin ? 'Accede a tu cuenta para continuar' : 'Crea una cuenta para empezar a ahorrar'}
          </p>
        </div>

        <form className="space-y-5 mt-10 animate-fade-in-up" onSubmit={handleAuth}>
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">
              Correo electrónico
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-200 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}
          {message && (
            <div className="text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center items-center rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
          <button
            onClick={() => {
              setIsLogin(!isLogin)
              setError(null)
              setMessage(null)
            }}
            className="font-semibold text-blue-600 hover:text-blue-500 transition-colors"
          >
            {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </p>
      </div>

      {/* Reclamos de valor */}
      <div className="max-w-sm w-full mx-auto mt-10 grid grid-cols-3 gap-3 text-center animate-fade-in">
        {[
          { icon: ScanLine, label: 'Escanea con IA' },
          { icon: Wallet, label: 'Controla tu gasto' },
          { icon: Sparkles, label: 'Ahorra más' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Icon size={18} />
            </div>
            <span className="text-[11px] font-medium leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
