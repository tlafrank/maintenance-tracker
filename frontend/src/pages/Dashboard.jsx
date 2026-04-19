import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

function formatValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return ''
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function DashboardPage() {
  const [data, setData] = useState({ due_soon: [], overdue: [], recent_events: [] })
  const dueSoonWeeks = 2

  useEffect(() => {
    apiFetch('/dashboard').then(setData)
  }, [])

  return (
    <div className="grid">
      <section className="card">
        <h3 className="h5">Overdue</h3>
        {data.overdue.length === 0 && <p className="muted-text">No overdue tasks 🎉</p>}
        {data.overdue.map(i => <p key={i.schedule_id}>{i.asset_name}: {i.schedule_title}</p>)}
      </section>
      <section className="card">
        <h3 className="h5">{`Due in the next ${dueSoonWeeks} weeks`}</h3>
        {data.due_soon.map(i => <p key={i.schedule_id}>{i.asset_name}: {i.schedule_title}</p>)}
      </section>
      <section className="card">
        <h3 className="h5">Recently completed</h3>
        {data.recent_events.map((event) => (
          <div key={event.id} className="meter-highlight">
            <p>
              <Link to={`/assets/${event.asset_id}`}>
                <strong>{event.asset_name}</strong>
              </Link>
              {' · '}
              {new Date(event.performed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              {event.completion_meter_value !== null ? ` @ ${formatValue(event.completion_meter_value)} km` : ''}
            </p>
            <div className="badges">
              {event.event_type.split(',').map((task) => {
                const trimmed = task.trim()
                return trimmed ? <span key={`${event.id}-${trimmed}`} className="badge">{trimmed}</span> : null
              })}
            </div>
            {event.notes && <p className="muted-text">{event.notes}</p>}
          </div>
        ))}
      </section>
    </div>
  )
}
