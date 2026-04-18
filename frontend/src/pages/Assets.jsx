import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

const INTERVAL_BASIS_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'hours', label: 'Hours' },
  { value: 'cycles', label: 'Cycles' },
]

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
  const [assetTypes, setAssetTypes] = useState([])
  const [newAssetType, setNewAssetType] = useState('')
  const [isSavingAssetType, setIsSavingAssetType] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    asset_type: '',
    manufacturer: '',
    model: '',
    year: '',
    registration_or_serial: '',
    notes: '',
    interval_basis: 'distance',
  })

  const canSubmitAsset = useMemo(() => form.name.trim() && form.asset_type, [form])

  async function refreshAssetTypes() {
    const result = await apiFetch('/asset-types')
    setAssetTypes(result)
    if (!form.asset_type && result.length > 0) {
      setForm((current) => ({ ...current, asset_type: result[0].name }))
    }
  }

  useEffect(() => { refreshAssetTypes() }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    await apiFetch('/assets', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        year: form.year ? Number(form.year) : null,
      }),
    })
    navigate('/assets')
  }

  async function addAssetType(e) {
    e.preventDefault()
    const trimmed = newAssetType.trim()
    if (!trimmed) return

    setError('')
    setIsSavingAssetType(true)
    try {
      const created = await apiFetch('/asset-types', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      })
      await refreshAssetTypes()
      setForm((current) => ({ ...current, asset_type: created.name }))
      setNewAssetType('')
    } catch (err) {
      setError(err.message || 'Unable to add asset type')
    } finally {
      setIsSavingAssetType(false)
    }
  }

  return (
    <div className="grid">
      <form onSubmit={submit} className="card">
        <h2>Add asset</h2>
        {error && <p className="error">{error}</p>}

        <label htmlFor="asset-name">Asset Name</label>
        <input id="asset-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

        <label htmlFor="asset-type">Asset Type</label>
        <select id="asset-type" required value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })}>
          {assetTypes.length === 0 && <option value="">No asset types available</option>}
          {assetTypes.map((type) => <option key={type.id} value={type.name}>{type.name}</option>)}
        </select>

        <label htmlFor="asset-manufacturer">Manufacturer</label>
        <input id="asset-manufacturer" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />

        <label htmlFor="asset-model">Model</label>
        <input id="asset-model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />

        <label htmlFor="asset-year">Year</label>
        <input id="asset-year" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} inputMode="numeric" />

        <label htmlFor="asset-registration">Registration / Serial Number</label>
        <input id="asset-registration" value={form.registration_or_serial} onChange={e => setForm({ ...form, registration_or_serial: e.target.value })} />

        <fieldset>
          <legend>Usage Interval Basis</legend>
          <p className="hint">Separate from elapsed time-based intervals.</p>
          {INTERVAL_BASIS_OPTIONS.map((option) => (
            <label key={option.value} className="radio-label">
              <input
                type="radio"
                name="interval_basis"
                value={option.value}
                checked={form.interval_basis === option.value}
                onChange={e => setForm({ ...form, interval_basis: e.target.value })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label htmlFor="asset-notes">Notes</label>
        <textarea id="asset-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={5} />

        <button type="submit" disabled={!canSubmitAsset}>Save</button>
      </form>

      <form onSubmit={addAssetType} className="card">
        <h2>Add asset type</h2>
        <label htmlFor="new-asset-type">Asset Type Name</label>
        <input
          id="new-asset-type"
          required
          value={newAssetType}
          onChange={e => setNewAssetType(e.target.value)}
          placeholder="e.g., Forklift"
        />
        <button type="submit" disabled={isSavingAssetType}>{isSavingAssetType ? 'Saving...' : 'Add type'}</button>
      </form>
    </div>
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
        <div className="actions">
          <Link to={`/assets/${id}/intervals/update`}>Update usage interval</Link>
          <Link to={`/assets/${id}/schedules/new`}>Add scheduled maintenance activity</Link>
        </div>
      </section>
      <section className="card">
        <h3>Maintenance history</h3>
        {events.map(ev => <p key={ev.id}>{new Date(ev.performed_at).toLocaleString()} - {ev.event_type} {ev.notes || ''}</p>)}
        <div className="actions">
          <Link to={`/assets/${id}/maintenance-events/new`}>Register maintenance activity</Link>
        </div>
      </section>
    </div>
  )
}

export function ScheduleIntervalUpdatePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [form, setForm] = useState({ schedule_id: '', interval_days: '', interval_distance: '', interval_hours: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch(`/assets/${id}`), apiFetch(`/assets/${id}/schedules`)])
      .then(([assetResult, scheduleResult]) => {
        setAsset(assetResult)
        setSchedules(scheduleResult)
        if (scheduleResult.length > 0) {
          const firstSchedule = scheduleResult[0]
          setForm({
            schedule_id: String(firstSchedule.id),
            interval_days: firstSchedule.interval_days ?? '',
            interval_distance: firstSchedule.interval_distance ?? '',
            interval_hours: firstSchedule.interval_hours ?? '',
          })
        }
      })
      .catch((err) => setError(err.message || 'Unable to load schedule details'))
  }, [id])

  function onScheduleChange(scheduleId) {
    const selectedSchedule = schedules.find((schedule) => String(schedule.id) === scheduleId)
    if (!selectedSchedule) return
    setForm({
      schedule_id: scheduleId,
      interval_days: selectedSchedule.interval_days ?? '',
      interval_distance: selectedSchedule.interval_distance ?? '',
      interval_hours: selectedSchedule.interval_hours ?? '',
    })
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    await apiFetch(`/schedules/${form.schedule_id}/intervals`, {
      method: 'PATCH',
      body: JSON.stringify({
        interval_days: form.interval_days ? Number(form.interval_days) : null,
        interval_distance: form.interval_distance ? Number(form.interval_distance) : null,
        interval_hours: form.interval_hours ? Number(form.interval_hours) : null,
      }),
    })
    navigate(`/assets/${id}`)
  }

  return (
    <form onSubmit={submit} className="card narrow-card">
      <h2>Update usage interval</h2>
      {asset && <p className="hint">Adjust schedule intervals for <strong>{asset.name}</strong>.</p>}
      {error && <p className="error">{error}</p>}
      {schedules.length === 0 ? (
        <>
          <p>No schedules exist for this asset yet.</p>
          <div className="actions">
            <Link to={`/assets/${id}/schedules/new`}>Create a schedule first</Link>
            <Link to={`/assets/${id}`}>Back to asset</Link>
          </div>
        </>
      ) : (
        <>
          <label htmlFor="interval-schedule">Scheduled Maintenance</label>
          <select id="interval-schedule" value={form.schedule_id} onChange={(e) => onScheduleChange(e.target.value)}>
            {schedules.map((schedule) => <option key={schedule.id} value={schedule.id}>{schedule.title}</option>)}
          </select>

          <label htmlFor="interval-days">Interval (days)</label>
          <input id="interval-days" inputMode="numeric" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value })} />

          <label htmlFor="interval-distance">Interval (distance)</label>
          <input id="interval-distance" inputMode="decimal" value={form.interval_distance} onChange={(e) => setForm({ ...form, interval_distance: e.target.value })} />

          <label htmlFor="interval-hours">Interval (hours)</label>
          <input id="interval-hours" inputMode="decimal" value={form.interval_hours} onChange={(e) => setForm({ ...form, interval_hours: e.target.value })} />

          <div className="actions">
            <button type="submit">Save interval updates</button>
            <Link to={`/assets/${id}`}>Cancel</Link>
          </div>
        </>
      )}
    </form>
  )
}

export function MaintenanceEventFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [form, setForm] = useState({ event_type: 'maintenance', completion_meter_value: '', notes: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch(`/assets/${id}`)
      .then(setAsset)
      .catch((err) => setError(err.message || 'Unable to load asset details'))
  }, [id])

  async function submit(e) {
    e.preventDefault()
    setError('')
    await apiFetch(`/assets/${id}/maintenance-events`, {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        completion_meter_value: form.completion_meter_value ? Number(form.completion_meter_value) : null,
      }),
    })
    navigate(`/assets/${id}`)
  }

  return (
    <form onSubmit={submit} className="card narrow-card">
      <h2>Register maintenance activity</h2>
      {asset && <p className="hint">Capture completed work for <strong>{asset.name}</strong>.</p>}
      {error && <p className="error">{error}</p>}

      <label htmlFor="event-type">Activity Type</label>
      <input id="event-type" required value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />

      <label htmlFor="completion-meter">Meter at Completion</label>
      <input id="completion-meter" inputMode="decimal" value={form.completion_meter_value} onChange={(e) => setForm({ ...form, completion_meter_value: e.target.value })} />

      <label htmlFor="event-notes">Notes</label>
      <textarea id="event-notes" rows={5} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

      <div className="actions">
        <button type="submit">Record activity</button>
        <Link to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}

export function ScheduleFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', interval_days: '', interval_distance: '', interval_hours: '' })

  useEffect(() => {
    apiFetch(`/assets/${id}`)
      .then(setAsset)
      .catch((err) => setError(err.message || 'Unable to load asset details'))
  }, [id])

  async function submit(e) {
    e.preventDefault()
    setError('')
    await apiFetch(`/assets/${id}/schedules`, {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        interval_days: form.interval_days ? Number(form.interval_days) : null,
        interval_distance: form.interval_distance ? Number(form.interval_distance) : null,
        interval_hours: form.interval_hours ? Number(form.interval_hours) : null,
      }),
    })
    navigate(`/assets/${id}`)
  }

  return (
    <form onSubmit={submit} className="card narrow-card">
      <h2>Add scheduled maintenance activity</h2>
      {asset && <p className="hint">Create a recurring maintenance schedule for <strong>{asset.name}</strong>.</p>}
      {error && <p className="error">{error}</p>}

      <label htmlFor="schedule-title">Schedule Title</label>
      <input id="schedule-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />

      <label htmlFor="schedule-description">Description</label>
      <textarea id="schedule-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <label htmlFor="schedule-interval-days">Interval (days)</label>
      <input id="schedule-interval-days" inputMode="numeric" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value })} />

      <label htmlFor="schedule-interval-distance">Interval (distance)</label>
      <input id="schedule-interval-distance" inputMode="decimal" value={form.interval_distance} onChange={(e) => setForm({ ...form, interval_distance: e.target.value })} />

      <label htmlFor="schedule-interval-hours">Interval (hours)</label>
      <input id="schedule-interval-hours" inputMode="decimal" value={form.interval_hours} onChange={(e) => setForm({ ...form, interval_hours: e.target.value })} />

      <div className="actions">
        <button type="submit">Save schedule</button>
        <Link to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}
