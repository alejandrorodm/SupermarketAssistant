import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Auth } from './pages/Auth'
import type { Session } from '@supabase/supabase-js'

// Carga diferida del resto de páginas para reducir el bundle inicial.
// Auth se mantiene eager por ser la primera pantalla.
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Scan = lazy(() => import('./pages/Scan').then((m) => ({ default: m.Scan })))
const Review = lazy(() => import('./pages/Review').then((m) => ({ default: m.Review })))
const Compare = lazy(() => import('./pages/Compare').then((m) => ({ default: m.Compare })))
const Stats = lazy(() => import('./pages/Stats').then((m) => ({ default: m.Stats })))
const TicketDetail = lazy(() => import('./pages/TicketDetail').then((m) => ({ default: m.TicketDetail })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))
const ShoppingList = lazy(() => import('./pages/ShoppingList').then((m) => ({ default: m.ShoppingList })))
const History = lazy(() => import('./pages/History').then((m) => ({ default: m.History })))
const EditTicket = lazy(() => import('./pages/EditTicket').then((m) => ({ default: m.EditTicket })))
const Households = lazy(() => import('./pages/Households').then((m) => ({ default: m.Households })))
const Balance = lazy(() => import('./pages/Balance').then((m) => ({ default: m.Balance })))
const Goals = lazy(() => import('./pages/Goals').then((m) => ({ default: m.Goals })))
const BatchScan = lazy(() => import('./pages/BatchScan').then((m) => ({ default: m.BatchScan })))
const Inventory = lazy(() => import('./pages/Inventory').then((m) => ({ default: m.Inventory })))

function Loader() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

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
    return <Loader />
  }

  const protect = (element: React.ReactNode) =>
    session ? element : <Navigate to="/auth" replace />

  return (
    <Router>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" replace />} />

          {/* Rutas protegidas */}
          <Route path="/" element={protect(<Dashboard />)} />
          <Route path="/scan" element={protect(<Scan />)} />
          <Route path="/scan/batch" element={protect(<BatchScan />)} />
          <Route path="/review" element={protect(<Review />)} />
          <Route path="/compare" element={protect(<Compare />)} />
          <Route path="/stats" element={protect(<Stats />)} />
          <Route path="/list" element={protect(<ShoppingList />)} />
          <Route path="/history" element={protect(<History />)} />
          <Route path="/settings" element={protect(<Settings />)} />
          <Route path="/households" element={protect(<Households />)} />
          <Route path="/balance" element={protect(<Balance />)} />
          <Route path="/goals" element={protect(<Goals />)} />
          <Route path="/inventory" element={protect(<Inventory />)} />
          <Route path="/ticket/:id" element={protect(<TicketDetail />)} />
          <Route path="/ticket/:id/edit" element={protect(<EditTicket />)} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
