const rawApiBase = import.meta.env.VITE_API_BASE_URL || '/api'
const API_BASE = rawApiBase.replace(/\/$/, '') || '/api'

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...(options.headers || {}) }
  const isFormData = options.body instanceof FormData
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!response.ok) {
    const rawBody = await response.text()
    let message = rawBody

    if (rawBody) {
      try {
        const payload = JSON.parse(rawBody)
        if (typeof payload === 'object' && payload !== null) {
          message = payload.detail || payload.message || JSON.stringify(payload)
        }
      } catch {
        // Keep raw text response as the error message.
      }
    }

    throw new Error(message || `Request failed (${response.status})`)
  }
  if (response.status === 204) return null
  return response.json()
}
