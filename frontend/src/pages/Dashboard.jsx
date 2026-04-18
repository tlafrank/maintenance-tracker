import { useEffect, useState } from 'react'
import { apiFetch } from '../api/client'

export function DashboardPage() {
  const [data, setData] = useState({ due_soon: [], overdue: [], recent_events: [] })

  useEffect(() => {
    apiFetch('/dashboard').then(setData)
  }, [])

  return (
    <div className="grid">
      <section className="card">
        <h3>Overdue</h3>
        {data.overdue.map(i => <p key={i.schedule_id}>{i.asset_name}: {i.schedule_title}</p>)}
      </section>
      <section className="card">
        <h3>Due soon</h3>
        {data.due_soon.map(i => <p key={i.schedule_id}>{i.asset_name}: {i.schedule_title}</p>)}
      </section>
      <section className="card">
        <h3>Recently completed</h3>
        {data.recent_events.map(i => <p key={i.id}>{new Date(i.performed_at).toLocaleString()} - {i.event_type}</p>)}
      </section>
    </div>
  )
}
