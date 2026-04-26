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
    <form onSubmit={submit} className="card narrow-card">
      <h2 className="h4">Login</h2>
      <label htmlFor="login-email">Email</label>
      <input id="login-email" className="form-control" required type="email" value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="login-password">Password</label>
      <input id="login-password" className="form-control" required type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <button className="btn btn-primary" type="submit">Sign in</button>
    </form>
  )
}

export function RegisterPage({ registrationEnabled }) {
  const [form, setForm] = useState({ email: '', password: '' })
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

  if (!registrationEnabled) {
    return (
      <div className="card narrow-card">
        <h2 className="h4">Register</h2>
        <p>New account registration is currently disabled. Contact an administrator for access.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card narrow-card">
      <h2 className="h4">Register</h2>
      <label htmlFor="register-email">Email</label>
      <input id="register-email" className="form-control" required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
      <label htmlFor="register-password">Password</label>
      <input id="register-password" className="form-control" required type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}
      <button className="btn btn-primary" type="submit">Create account</button>
    </form>
  )
}
