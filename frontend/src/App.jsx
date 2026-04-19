import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiFetch } from './api/client'
import {
  AssetDetailPage,
  AssetEditPage,
  AssetFormPage,
  AssetListPage,
  MaintenanceEventFormPage,
  MeterReadingFormPage,
  ScheduleEditPage,
  ScheduleFormPage,
} from './pages/Assets'
import { DashboardPage } from './pages/Dashboard'
import { LoginPage, RegisterPage } from './pages/Auth'
import { ProfilePage } from './pages/Profile'

function ProtectedRoute({ children }) {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    let active = true
    async function refreshSession() {
      try {
        const user = await apiFetch('/auth/me')
        if (active) setMe(user)
      } catch {
        // Keep existing token/session in place and retry on next heartbeat.
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
            <Link className="btn btn-outline-primary btn-sm" to="/dashboard">Dashboard</Link>
            <Link className="btn btn-outline-primary btn-sm" to="/assets">Assets</Link>
            {!me && <Link className="btn btn-outline-secondary btn-sm" to="/login">Login</Link>}
            {!me && <Link className="btn btn-outline-secondary btn-sm" to="/register">Register</Link>}
            {me && <Link className="btn btn-outline-secondary btn-sm" to="/profile">Profile</Link>}
          {me && (
            <button className="btn btn-danger btn-sm" onClick={() => { localStorage.removeItem('token'); setMe(null); navigate('/login') }}>
              Logout
            </button>
          )}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setMe} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute><AssetListPage /></ProtectedRoute>} />
        <Route path="/assets/new" element={<ProtectedRoute><AssetFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />
        <Route path="/assets/:id/edit" element={<ProtectedRoute><AssetEditPage /></ProtectedRoute>} />
        <Route path="/assets/:id/readings/new" element={<ProtectedRoute><MeterReadingFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id/maintenance-events/new" element={<ProtectedRoute><MaintenanceEventFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id/schedules/new" element={<ProtectedRoute><ScheduleFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id/schedules/:scheduleId/edit" element={<ProtectedRoute><ScheduleEditPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}
