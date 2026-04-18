const API_BASE = '/api'

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!response.ok) {
    let text = ''
    try {
      const payload = await response.json()
      text = payload.detail || JSON.stringify(payload)
    } catch {
      text = await response.text()
    }
    throw new Error(text || 'Request failed')
  }
  if (response.status === 204) return null
  return response.json()
}
