import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    const body = new URLSearchParams({ username: email, password })
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    if (!response.ok) {
      setError('Invalid login')
      return
    }
    const data = await response.json()
    localStorage.setItem('token', data.access_token)
    const me = await apiFetch('/auth/me')
    onLogin(me)
    navigate('/dashboard')
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>Login</h2>
      <input required type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input required type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button type="submit">Sign in</button>
    </form>
  )
}

export function RegisterPage() {
  const [form, setForm] = useState({ email: '', display_name: '', password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(form) })
      setMessage('Registered. You can now log in.')
    } catch (err) {
      setError(err.message || 'Unable to create account')
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>Register</h2>
      <input required type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <input required placeholder="Display name" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
      <input required type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}
      <button type="submit">Create account</button>
    </form>
  )
}
