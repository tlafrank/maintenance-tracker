import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { apiFetch } from './api/client'
import {
  AssetDetailPage,
  AssetFormPage,
  AssetListPage,
  MaintenanceEventFormPage,
  ScheduleFormPage,
  ScheduleIntervalUpdatePage,
} from './pages/Assets'
import { DashboardPage } from './pages/Dashboard'
import { LoginPage, RegisterPage } from './pages/Auth'

function ProtectedRoute({ children }) {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const navigate = useNavigate()
  const [me, setMe] = useState(null)

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    apiFetch('/auth/me').then(setMe).catch(() => localStorage.removeItem('token'))
  }, [])

  return (
    <div className="container">
      <header>
        <h1>Maintenance Tracker</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/assets">Assets</Link>
          {!me && <Link to="/login">Login</Link>}
          {!me && <Link to="/register">Register</Link>}
          {me && (
            <button onClick={() => { localStorage.removeItem('token'); setMe(null); navigate('/login') }}>
              Logout
            </button>
          )}
        </nav>
      </header>

      <Routes>
        <Route path="/login" element={<LoginPage onLogin={setMe} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/assets" element={<ProtectedRoute><AssetListPage /></ProtectedRoute>} />
        <Route path="/assets/new" element={<ProtectedRoute><AssetFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />
        <Route path="/assets/:id/intervals/update" element={<ProtectedRoute><ScheduleIntervalUpdatePage /></ProtectedRoute>} />
        <Route path="/assets/:id/maintenance-events/new" element={<ProtectedRoute><MaintenanceEventFormPage /></ProtectedRoute>} />
        <Route path="/assets/:id/schedules/new" element={<ProtectedRoute><ScheduleFormPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}
