import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Auth } from './pages/Auth'
import { Dashboard } from './pages/Dashboard'
import { Scan } from './pages/Scan'
import { Review } from './pages/Review'
import { Compare } from './pages/Compare'
import { Stats } from './pages/Stats'
import { TicketDetail } from './pages/TicketDetail'
import { Settings } from './pages/Settings'
import { ShoppingList } from './pages/ShoppingList'
import { History } from './pages/History'
import { EditTicket } from './pages/EditTicket'
import { Households } from './pages/Households'
import { Balance } from './pages/Balance'
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

  const protect = (element: React.ReactNode) =>
    session ? element : <Navigate to="/auth" replace />

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" replace />} />

        {/* Rutas protegidas */}
        <Route path="/" element={protect(<Dashboard />)} />
        <Route path="/scan" element={protect(<Scan />)} />
        <Route path="/review" element={protect(<Review />)} />
        <Route path="/compare" element={protect(<Compare />)} />
        <Route path="/stats" element={protect(<Stats />)} />
        <Route path="/list" element={protect(<ShoppingList />)} />
        <Route path="/history" element={protect(<History />)} />
        <Route path="/settings" element={protect(<Settings />)} />
        <Route path="/households" element={protect(<Households />)} />
        <Route path="/balance" element={protect(<Balance />)} />
        <Route path="/ticket/:id" element={protect(<TicketDetail />)} />
        <Route path="/ticket/:id/edit" element={protect(<EditTicket />)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
