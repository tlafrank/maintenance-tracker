import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

const INTERVAL_BASIS_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'hours', label: 'Hours' },
  { value: 'cycles', label: 'Cycles' },
]

const METER_TYPE_LABELS = {
  distance: 'Distance',
  hours: 'Hours',
  cycles: 'Cycles',
}

function relativeTimeFromNow(isoDateString) {
  if (!isoDateString) return 'Unknown'
  const ms = Date.now() - new Date(isoDateString).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'Just now'
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day

  if (ms < hour) {
    const value = Math.max(1, Math.floor(ms / minute))
    return `${value} minute${value === 1 ? '' : 's'} ago`
  }
  if (ms < day) {
    const value = Math.floor(ms / hour)
    return `${value} hour${value === 1 ? '' : 's'} ago`
  }
  if (ms < week) {
    const value = Math.floor(ms / day)
    return `${value} day${value === 1 ? '' : 's'} ago`
  }
  if (ms < month) {
    const value = Math.floor(ms / week)
    return `${value} week${value === 1 ? '' : 's'} ago`
  }
  if (ms < year) {
    const value = Math.floor(ms / month)
    return `${value} month${value === 1 ? '' : 's'} ago`
  }
  const value = Math.floor(ms / year)
  return `${value} year${value === 1 ? '' : 's'} ago`
}

function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.label}>
          {index > 0 && <span className="breadcrumb-separator">/</span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

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
  const [readings, setReadings] = useState([])
  const [schedules, setSchedules] = useState([])
  const [events, setEvents] = useState([])
  const [meterForm, setMeterForm] = useState({ unit: 'km', current_value: '' })
  const [readingForm, setReadingForm] = useState({ meter_id: '', reading_value: '', notes: '' })

  async function refresh() {
    const [a, m, r, s, e] = await Promise.all([
      apiFetch(`/assets/${id}`),
      apiFetch(`/assets/${id}/meters`),
      apiFetch(`/assets/${id}/readings`),
      apiFetch(`/assets/${id}/schedules`),
      apiFetch(`/assets/${id}/maintenance-events`)
    ])
    setAsset(a); setMeters(m); setReadings(r); setSchedules(s); setEvents(e)
  }

  useEffect(() => { refresh() }, [id])
  const compatibleMeters = useMemo(
    () => meters.filter((meter) => meter.meter_type === asset?.interval_basis),
    [meters, asset],
  )
  const latestReading = readings[0]

  useEffect(() => {
    if (compatibleMeters.length === 0) {
      setReadingForm((current) => ({ ...current, meter_id: '' }))
      return
    }
    setReadingForm((current) => ({
      ...current,
      meter_id: current.meter_id || String(compatibleMeters[0].id),
    }))
  }, [compatibleMeters])

  if (!asset) return <p>Loading...</p>
  return (
    <div className="grid">
      <section className="card">
        <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset.name }]} />
      </section>
      <section className="card"><h2>{asset.name}</h2><p>{asset.asset_type}</p><p>{asset.notes}</p></section>
      <section className="card">
        <h3>Meters</h3>
        <p className="hint">Tracking basis: <strong>{METER_TYPE_LABELS[asset.interval_basis] || asset.interval_basis}</strong>.</p>
        {latestReading ? (
          <div className="meter-highlight">
            <p><strong>Latest reading:</strong> {latestReading.reading_value}</p>
            <p><strong>Recorded:</strong> {new Date(latestReading.reading_timestamp).toLocaleString()}</p>
            <p><strong>When:</strong> {relativeTimeFromNow(latestReading.reading_timestamp)}</p>
          </div>
        ) : (
          <p>No meter readings recorded yet.</p>
        )}
        <form onSubmit={async e => {
          e.preventDefault()
          await apiFetch(`/assets/${id}/meters`, {
            method: 'POST',
            body: JSON.stringify({
              meter_type: asset.interval_basis,
              unit: meterForm.unit,
              current_value: meterForm.current_value ? Number(meterForm.current_value) : null,
            }),
          })
          setMeterForm({ unit: meterForm.unit, current_value: '' })
          refresh()
        }}>
          <h4>Add compatible meter</h4>
          <label htmlFor="meter-type">Meter Type</label>
          <input id="meter-type" value={METER_TYPE_LABELS[asset.interval_basis] || asset.interval_basis} disabled />

          <label htmlFor="meter-unit">Unit</label>
          <input id="meter-unit" required value={meterForm.unit} onChange={e => setMeterForm({ ...meterForm, unit: e.target.value })} />

          <label htmlFor="meter-current">Current Value</label>
          <input id="meter-current" inputMode="decimal" value={meterForm.current_value} onChange={e => setMeterForm({ ...meterForm, current_value: e.target.value })} />
          <button type="submit">Add meter</button>
        </form>
        <form onSubmit={async e => {
          e.preventDefault()
          await apiFetch(`/assets/${id}/readings`, {
            method: 'POST',
            body: JSON.stringify({
              ...readingForm,
              meter_id: Number(readingForm.meter_id),
              reading_value: Number(readingForm.reading_value),
            }),
          })
          setReadingForm({ meter_id: compatibleMeters[0] ? String(compatibleMeters[0].id) : '', reading_value: '', notes: '' })
          refresh()
        }}>
          <h4>Add meter reading</h4>
          {compatibleMeters.length === 0 ? (
            <p className="hint">Create a {asset.interval_basis} meter first before adding readings.</p>
          ) : (
            <>
              <label htmlFor="reading-meter">Meter</label>
              <select id="reading-meter" value={readingForm.meter_id} onChange={e => setReadingForm({ ...readingForm, meter_id: e.target.value })}>
                {compatibleMeters.map((meter) => <option key={meter.id} value={meter.id}>{meter.meter_type} ({meter.unit})</option>)}
              </select>

              <label htmlFor="reading-value">Reading Value</label>
              <input id="reading-value" required inputMode="decimal" value={readingForm.reading_value} onChange={e => setReadingForm({ ...readingForm, reading_value: e.target.value })} />

              <label htmlFor="reading-notes">Notes</label>
              <input id="reading-notes" value={readingForm.notes} onChange={e => setReadingForm({ ...readingForm, notes: e.target.value })} />

              <button type="submit">Add reading</button>
            </>
          )}
        </form>
      </section>
      <section className="card">
        <h3>Maintenance actions</h3>
        <div className="actions">
          <Link className="action-button" to={`/assets/${id}/intervals/update`}>Update usage interval</Link>
          <Link className="action-button" to={`/assets/${id}/schedules/new`}>Add scheduled maintenance activity</Link>
          <Link className="action-button" to={`/assets/${id}/maintenance-events/new`}>Register maintenance activity</Link>
        </div>
      </section>
      <section className="card">
        <h3>Schedules</h3>
        {schedules.map(s => <p key={s.id}>{s.title} (days:{s.interval_days || '-'} km:{s.interval_distance || '-'} hrs:{s.interval_hours || '-'})</p>)}
      </section>
      <section className="card">
        <h3>Maintenance history</h3>
        {events.map(ev => <p key={ev.id}>{new Date(ev.performed_at).toLocaleString()} - {ev.event_type} {ev.notes || ''}</p>)}
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
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset?.name || 'Asset', to: `/assets/${id}` }, { label: 'Update usage interval' }]} />
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
  const [activitySuggestions, setActivitySuggestions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch(`/assets/${id}`), apiFetch('/maintenance-activities')])
      .then(([assetResult, suggestions]) => {
        setAsset(assetResult)
        setActivitySuggestions(suggestions)
      })
      .catch((err) => setError(err.message || 'Unable to load asset details'))
  }, [id])

  function handleActivityTypeChange(nextValue) {
    setForm((current) => ({ ...current, event_type: nextValue }))
    const matched = activitySuggestions.find((suggestion) => suggestion.activity_name.toLowerCase() === nextValue.trim().toLowerCase())
    if (!matched) return
    setForm((current) => ({
      ...current,
      event_type: matched.activity_name,
      completion_meter_value: matched.last_completion_meter_value ?? '',
      notes: matched.last_notes ?? '',
    }))
  }

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
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset?.name || 'Asset', to: `/assets/${id}` }, { label: 'Register maintenance activity' }]} />
      <h2>Register maintenance activity</h2>
      {asset && <p className="hint">Capture completed work for <strong>{asset.name}</strong>.</p>}
      {error && <p className="error">{error}</p>}

      <label htmlFor="event-type">Maintenance Activity</label>
      <input
        id="event-type"
        list="maintenance-activity-options"
        required
        value={form.event_type}
        onChange={(e) => handleActivityTypeChange(e.target.value)}
      />
      <datalist id="maintenance-activity-options">
        {activitySuggestions.map((suggestion) => <option key={suggestion.activity_name} value={suggestion.activity_name} />)}
      </datalist>

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
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset?.name || 'Asset', to: `/assets/${id}` }, { label: 'Add scheduled maintenance activity' }]} />
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
