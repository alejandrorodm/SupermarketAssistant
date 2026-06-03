import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'
import { ToastProvider } from './contexts/ToastContext'
import { HouseholdProvider } from './contexts/HouseholdContext'
import { NotificationsProvider } from './contexts/NotificationsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <HouseholdProvider>
          <NotificationsProvider>
            <App />
          </NotificationsProvider>
        </HouseholdProvider>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
