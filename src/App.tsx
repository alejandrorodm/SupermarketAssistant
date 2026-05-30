import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Scan } from './pages/Scan'
import { Review } from './pages/Review'
import type { Session } from '@supabase/supabase-js'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/auth" 
          element={!session ? <Auth /> : <Navigate to="/" replace />} 
        />
        
        {/* Rutas protegidas */}
        <Route 
          path="/" 
          element={session ? <Dashboard /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/scan" 
          element={session ? <Scan /> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/review" 
          element={session ? <Review /> : <Navigate to="/auth" replace />} 
        />
        
        {/* Placeholders temporales para las demás rutas del BottomNav */}
        <Route 
          path="/stats" 
          element={session ? <div className="p-6">Estadísticas (Próximamente)</div> : <Navigate to="/auth" replace />} 
        />
        <Route 
          path="/compare" 
          element={session ? <div className="p-6">Comparador (Próximamente)</div> : <Navigate to="/auth" replace />} 
        />
      </Routes>
    </Router>
  )
}

export default App
