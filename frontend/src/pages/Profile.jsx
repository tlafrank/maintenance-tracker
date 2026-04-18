import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

const DISTANCE_UNITS = ['km', 'mi']

export function ProfilePage() {
  const [form, setForm] = useState({
    display_name: '',
    preferred_distance_unit: 'km',
    current_password: '',
    new_password: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    apiFetch('/auth/me').then((me) => {
      setForm((current) => ({
        ...current,
        display_name: me.display_name,
        preferred_distance_unit: me.preferred_distance_unit || 'km',
      }))
    })
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      setForm((current) => ({ ...current, current_password: '', new_password: '' }))
      setMessage('Profile updated.')
    } catch (err) {
      setError(err.message || 'Unable to update profile')
    }
  }

  return (
    <form onSubmit={submit} className="card narrow-card">
      <h2>Profile</h2>
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}

      <label htmlFor="profile-name">Name</label>
      <input id="profile-name" required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />

      <label htmlFor="profile-unit">Preferred Distance Unit</label>
      <select id="profile-unit" value={form.preferred_distance_unit} onChange={(e) => setForm({ ...form, preferred_distance_unit: e.target.value })}>
        {DISTANCE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
      </select>

      <label htmlFor="profile-current-password">Current Password</label>
      <input id="profile-current-password" type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />

      <label htmlFor="profile-new-password">New Password</label>
      <input id="profile-new-password" type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />

      <div className="actions">
        <button type="submit">Save profile</button>
        <Link to="/dashboard">Cancel</Link>
      </div>
    </form>
  )
}
