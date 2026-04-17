import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

export function AssetListPage() {
  const [assets, setAssets] = useState([])
  useEffect(() => { apiFetch('/assets').then(setAssets) }, [])
  return (
    <div className="card">
      <h2>Assets</h2>
      <Link to="/assets/new">Add asset</Link>
      {assets.map(a => <p key={a.id}><Link to={`/assets/${a.id}`}>{a.name}</Link> ({a.asset_type})</p>)}
    </div>
  )
}

export function AssetFormPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', asset_type: '', manufacturer: '', model: '', year: '', registration_or_serial: '', notes: '' })
  async function submit(e) {
    e.preventDefault()
    await apiFetch('/assets', { method: 'POST', body: JSON.stringify({ ...form, year: form.year ? Number(form.year) : null }) })
    navigate('/assets')
  }

  return (
    <form onSubmit={submit} className="card">
      <h2>Add asset</h2>
      {['name', 'asset_type', 'manufacturer', 'model', 'year', 'registration_or_serial', 'notes'].map((f) => (
        <input key={f} required={f === 'name' || f === 'asset_type'} placeholder={f} value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })} />
      ))}
      <button type="submit">Save</button>
    </form>
  )
}

export function AssetDetailPage() {
  const { id } = useParams()
  const [asset, setAsset] = useState(null)
  const [meters, setMeters] = useState([])
  const [schedules, setSchedules] = useState([])
  const [events, setEvents] = useState([])
  const [meterForm, setMeterForm] = useState({ meter_type: 'distance', unit: 'km', current_value: '' })
  const [readingForm, setReadingForm] = useState({ meter_id: '', reading_value: '', notes: '' })
  const [scheduleForm, setScheduleForm] = useState({ title: '', interval_days: '', interval_distance: '', interval_hours: '' })
  const [eventForm, setEventForm] = useState({ event_type: 'maintenance', notes: '', completion_meter_value: '' })

  async function refresh() {
    const [a, m, s, e] = await Promise.all([
      apiFetch(`/assets/${id}`),
      apiFetch(`/assets/${id}/meters`),
      apiFetch(`/assets/${id}/schedules`),
      apiFetch(`/assets/${id}/maintenance-events`)
    ])
    setAsset(a); setMeters(m); setSchedules(s); setEvents(e)
  }

  useEffect(() => { refresh() }, [id])

  if (!asset) return <p>Loading...</p>
  return (
    <div className="grid">
      <section className="card"><h2>{asset.name}</h2><p>{asset.asset_type}</p><p>{asset.notes}</p></section>
      <section className="card">
        <h3>Meters</h3>
        {meters.map(m => <p key={m.id}>{m.meter_type}: {m.current_value ?? '-'} {m.unit}</p>)}
        <form onSubmit={async e => { e.preventDefault(); await apiFetch(`/assets/${id}/meters`, { method: 'POST', body: JSON.stringify({ ...meterForm, current_value: meterForm.current_value ? Number(meterForm.current_value) : null }) }); setMeterForm({ meter_type: 'distance', unit: 'km', current_value: '' }); refresh() }}>
          <input value={meterForm.meter_type} onChange={e => setMeterForm({ ...meterForm, meter_type: e.target.value })} placeholder="meter_type" />
          <input value={meterForm.unit} onChange={e => setMeterForm({ ...meterForm, unit: e.target.value })} placeholder="unit" />
          <input value={meterForm.current_value} onChange={e => setMeterForm({ ...meterForm, current_value: e.target.value })} placeholder="current" />
          <button>Add meter</button>
        </form>
        <form onSubmit={async e => { e.preventDefault(); await apiFetch(`/assets/${id}/readings`, { method: 'POST', body: JSON.stringify({ ...readingForm, meter_id: Number(readingForm.meter_id), reading_value: Number(readingForm.reading_value) }) }); setReadingForm({ meter_id: '', reading_value: '', notes: '' }); refresh() }}>
          <input value={readingForm.meter_id} onChange={e => setReadingForm({ ...readingForm, meter_id: e.target.value })} placeholder="meter_id" />
          <input value={readingForm.reading_value} onChange={e => setReadingForm({ ...readingForm, reading_value: e.target.value })} placeholder="reading" />
          <input value={readingForm.notes} onChange={e => setReadingForm({ ...readingForm, notes: e.target.value })} placeholder="notes" />
          <button>Add reading</button>
        </form>
      </section>
      <section className="card">
        <h3>Schedules</h3>
        {schedules.map(s => <p key={s.id}>{s.title} (days:{s.interval_days || '-'} km:{s.interval_distance || '-'} hrs:{s.interval_hours || '-'})</p>)}
        <form onSubmit={async e => { e.preventDefault(); await apiFetch(`/assets/${id}/schedules`, { method: 'POST', body: JSON.stringify({ ...scheduleForm, interval_days: scheduleForm.interval_days ? Number(scheduleForm.interval_days) : null, interval_distance: scheduleForm.interval_distance ? Number(scheduleForm.interval_distance) : null, interval_hours: scheduleForm.interval_hours ? Number(scheduleForm.interval_hours) : null }) }); setScheduleForm({ title: '', interval_days: '', interval_distance: '', interval_hours: '' }); refresh() }}>
          <input required value={scheduleForm.title} onChange={e => setScheduleForm({ ...scheduleForm, title: e.target.value })} placeholder="title" />
          <input value={scheduleForm.interval_days} onChange={e => setScheduleForm({ ...scheduleForm, interval_days: e.target.value })} placeholder="interval days" />
          <input value={scheduleForm.interval_distance} onChange={e => setScheduleForm({ ...scheduleForm, interval_distance: e.target.value })} placeholder="interval distance" />
          <input value={scheduleForm.interval_hours} onChange={e => setScheduleForm({ ...scheduleForm, interval_hours: e.target.value })} placeholder="interval hours" />
          <button>Add schedule</button>
        </form>
      </section>
      <section className="card">
        <h3>Maintenance history</h3>
        {events.map(ev => <p key={ev.id}>{new Date(ev.performed_at).toLocaleString()} - {ev.event_type} {ev.notes || ''}</p>)}
        <form onSubmit={async e => { e.preventDefault(); await apiFetch(`/assets/${id}/maintenance-events`, { method: 'POST', body: JSON.stringify({ ...eventForm, completion_meter_value: eventForm.completion_meter_value ? Number(eventForm.completion_meter_value) : null }) }); setEventForm({ event_type: 'maintenance', notes: '', completion_meter_value: '' }); refresh() }}>
          <input value={eventForm.event_type} onChange={e => setEventForm({ ...eventForm, event_type: e.target.value })} placeholder="event type" />
          <input value={eventForm.completion_meter_value} onChange={e => setEventForm({ ...eventForm, completion_meter_value: e.target.value })} placeholder="meter at completion" />
          <input value={eventForm.notes} onChange={e => setEventForm({ ...eventForm, notes: e.target.value })} placeholder="notes" />
          <button>Record event</button>
        </form>
      </section>
    </div>
  )
}
