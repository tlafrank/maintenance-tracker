import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiFetch } from './api/client'
import {
  AssetDetailPage,
  AssetEditPage,
  AssetFormPage,
  AssetHistoryPage,
  AssetListPage,
  MaintenanceEventFormPage,
  MeterReadingFormPage,
  ScheduleEditPage,
  ScheduleFormPage,
} from './pages/Assets'
import { DashboardPage } from './pages/Dashboard'
import { LoginPage, RegisterPage } from './pages/Auth'
import { ProfilePage } from './pages/Profile'

function ProtectedRoute({ children, authState }) {
  if (authState === 'loading') return <p>Loading...</p>
  if (authState !== 'authenticated') return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)
  const [authState, setAuthState] = useState(localStorage.getItem('token') ? 'loading' : 'unauthenticated')
  const isAuthenticated = authState === 'authenticated'

  function logout() {
    localStorage.removeItem('token')
    setMe(null)
    setAuthState('unauthenticated')
    navigate('/login')
  }

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      setAuthState('unauthenticated')
      return
    }
    let active = true
    async function refreshSession() {
      try {
        const user = await apiFetch('/auth/me')
        if (active) {
          setMe(user)
          setAuthState('authenticated')
        }
      } catch {
        if (active) logout()
      }
    }
    refreshSession()
    const intervalId = setInterval(refreshSession, 10 * 60 * 1000)
    return () => {
      active = false
      clearInterval(intervalId)
    }
  }, [])

  return (
    <div className="container py-4">
      <header className="mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <h1 className="h3 mb-0">Maintenance Tracker</h1>
          <nav className="d-flex gap-2 flex-wrap">
            {isAuthenticated && <Link className="btn btn-outline-primary btn-sm" to="/dashboard">Dashboard</Link>}
            {isAuthenticated && <Link className="btn btn-outline-primary btn-sm" to="/assets">Assets</Link>}
            {!isAuthenticated && <Link className="btn btn-outline-secondary btn-sm" to="/login">Login</Link>}
            {!isAuthenticated && <Link className="btn btn-outline-secondary btn-sm" to="/register">Register</Link>}
            {me && <Link className="btn btn-outline-secondary btn-sm" to="/profile">Profile</Link>}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={(user) => { setMe(user); setAuthState('authenticated') }} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute authState={authState}><DashboardPage /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute authState={authState}><AssetListPage /></ProtectedRoute>} />
        <Route path="/assets/new" element={<ProtectedRoute authState={authState}><AssetFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id" element={<ProtectedRoute authState={authState}><AssetDetailPage /></ProtectedRoute>} />
        <Route path="/assets/:id/history" element={<ProtectedRoute authState={authState}><AssetHistoryPage /></ProtectedRoute>} />
        <Route path="/assets/:id/edit" element={<ProtectedRoute authState={authState}><AssetEditPage /></ProtectedRoute>} />
        <Route path="/assets/:id/readings/new" element={<ProtectedRoute authState={authState}><MeterReadingFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id/maintenance-events/new" element={<ProtectedRoute authState={authState}><MaintenanceEventFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id/schedules/new" element={<ProtectedRoute authState={authState}><ScheduleFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id/schedules/:scheduleId/edit" element={<ProtectedRoute authState={authState}><ScheduleEditPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute authState={authState}><ProfilePage onLogout={logout} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}
