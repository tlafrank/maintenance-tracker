import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

function formatValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return ''
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function usageUnit(serviceTrigger) {
  if (serviceTrigger === 'distance') return 'km'
  if (serviceTrigger === 'hours') return 'h'
  if (serviceTrigger === 'cycles') return 'cycles'
  return ''
}

function AssetThumbnail({ thumbnailPath, name }) {
  const [imageUnavailable, setImageUnavailable] = useState(false)
  if (!thumbnailPath || imageUnavailable) {
    return <div className="dashboard-thumbnail dashboard-thumbnail-placeholder" aria-hidden="true">No image</div>
  }
  return <img className="dashboard-thumbnail" src={`/api${thumbnailPath}`} alt={`${name} thumbnail`} onError={() => setImageUnavailable(true)} />
}

export function DashboardPage() {
  const [data, setData] = useState({ due_soon: [], overdue: [], recent_events: [] })
  const [upcomingWindowDays, setUpcomingWindowDays] = useState(14)

  useEffect(() => {
    Promise.all([apiFetch('/dashboard'), apiFetch('/auth/me')]).then(([dashboardData, me]) => {
      setData(dashboardData)
      setUpcomingWindowDays(me.upcoming_task_window_days || 14)
    })
  }, [])
  const dueSoonWeeks = Math.max(1, Math.ceil(upcomingWindowDays / 7))
  const groupedOverdue = data.overdue.reduce((acc, item) => {
    const existing = acc.get(item.asset_id) || {
      asset_id: item.asset_id,
      asset_name: item.asset_name,
      thumbnail_path: item.thumbnail_path,
      tasks: [],
    }
    existing.tasks.push(item.schedule_title)
    acc.set(item.asset_id, existing)
    return acc
  }, new Map())
  const overdueByAsset = Array.from(groupedOverdue.values())
  const dueSoonByAsset = data.due_soon.reduce((acc, item) => {
    const existing = acc.get(item.asset_id) || {
      asset_id: item.asset_id,
      asset_name: item.asset_name,
      thumbnail_path: item.thumbnail_path,
      tasks: [],
    }
    existing.tasks.push(item.schedule_title)
    acc.set(item.asset_id, existing)
    return acc
  }, new Map())
  const groupedDueSoon = Array.from(dueSoonByAsset.values())

  return (
    <div className="grid">
      <section className="card">
        <h3 className="h5">Overdue</h3>
        {data.overdue.length === 0 && <p className="muted-text">No overdue tasks 🎉</p>}
        {overdueByAsset.map((item) => (
          <div key={item.asset_id} className="upcoming-item">
            <div className="dashboard-asset-details">
              <AssetThumbnail thumbnailPath={item.thumbnail_path} name={item.asset_name} />
              <Link to={`/assets/${item.asset_id}`}><strong>{item.asset_name}</strong></Link>
              <div className="badges">
                {item.tasks.map((taskName) => <span key={`${item.asset_id}-${taskName}`} className="badge">{taskName}</span>)}
              </div>
            </div>
            <Link className="btn btn-sm btn-outline-primary" to={`/assets/${item.asset_id}/maintenance-events/new?task=${encodeURIComponent(item.tasks.join(', '))}`}>
              Record Activity
            </Link>
          </div>
        ))}
      </section>
      <section className="card">
        <h3 className="h5">{`Due in the next ${dueSoonWeeks} weeks`}</h3>
        {data.due_soon.length === 0 && <p className="muted-text">No upcoming tasks in this window.</p>}
        <div className="upcoming-list">
          {groupedDueSoon.map((item) => (
            <div key={item.asset_id} className="upcoming-item">
              <div className="dashboard-asset-details">
                <AssetThumbnail thumbnailPath={item.thumbnail_path} name={item.asset_name} />
                <Link to={`/assets/${item.asset_id}`}><strong>{item.asset_name}</strong></Link>
                <div className="badges">
                  {item.tasks.map((taskName) => <span key={`${item.asset_id}-${taskName}`} className="badge">{taskName}</span>)}
                </div>
              </div>
              <Link className="btn btn-sm btn-outline-primary" to={`/assets/${item.asset_id}/maintenance-events/new?task=${encodeURIComponent(item.tasks.join(', '))}`}>
                Record Activity
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <h3 className="h5">Recently completed</h3>
        {data.recent_events.map((event) => (
          <div key={event.id} className="meter-highlight dashboard-maintenance-card">
            <p>
              <Link to={`/assets/${event.asset_id}`}>
                <strong>{event.asset_name}</strong>
              </Link>
              {' · '}
              {new Date(event.performed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              {event.completion_meter_value !== null ? ` @ ${formatValue(event.completion_meter_value)} ${usageUnit(event.service_trigger)}` : ''}
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
