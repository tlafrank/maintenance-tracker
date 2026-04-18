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

const TIME_INTERVAL_OPTIONS = [
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'fortnightly', label: 'Fortnightly', days: 14 },
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 91 },
  { value: 'twice-yearly', label: 'Twice-yearly', days: 182 },
  { value: 'annually', label: 'Annually', days: 365 },
  { value: 'two-yearly', label: 'Two-yearly', days: 730 },
  { value: 'five-yearly', label: 'Five-yearly', days: 1825 },
]

function relativeTimeFromNow(isoDateString) {
  if (!isoDateString) return 'Unknown'
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(isoDateString)
  const normalizedDate = hasTimezone ? isoDateString : `${isoDateString}Z`
  const ms = Date.now() - new Date(normalizedDate).getTime()
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

function formatReadingDate(isoDateString) {
  if (!isoDateString) return ''
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(isoDateString)
  const normalizedDate = hasTimezone ? isoDateString : `${isoDateString}Z`
  return new Date(normalizedDate).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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
  const latestReading = readings[0]
  const compatibleMeters = useMemo(() => meters.filter((meter) => meter.meter_type === asset?.interval_basis), [meters, asset])
  const primaryCompatibleMeter = compatibleMeters[compatibleMeters.length - 1]
  const latestReadingMeter = meters.find((meter) => meter.id === latestReading?.meter_id)

  if (!asset) return <p>Loading...</p>
  return (
    <div className="grid">
      <section className="card span-all">
        <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset.name }]} />
        <h2>{asset.name}</h2>
        <p>{asset.asset_type}</p>
        {asset.notes && <p>{asset.notes}</p>}
      </section>
      <section className="card span-all">
        <h3>Maintenance actions</h3>
        <p className="hint">Use actions below to record work and manage maintenance schedules.</p>
        <div className="actions">
          <Link className="action-button" to={`/assets/${id}/readings/new`}>Add meter reading</Link>
          <Link className="action-button" to={`/assets/${id}/schedules/new`}>Add scheduled maintenance activity</Link>
          <Link className="action-button" to={`/assets/${id}/maintenance-events/new`}>Register maintenance activity</Link>
        </div>
      </section>
      <section className="card">
        <h3>Meters</h3>
        <p className="hint">Tracking basis: <strong>{METER_TYPE_LABELS[asset.interval_basis] || asset.interval_basis}</strong>.</p>
        {latestReading ? (
          <div className="meter-highlight">
            <p><strong>Last reading:</strong> {latestReading.reading_value} {latestReadingMeter?.unit || ''}</p>
            <p className="muted-text">{formatReadingDate(latestReading.reading_timestamp)} · {relativeTimeFromNow(latestReading.reading_timestamp)}</p>
          </div>
        ) : (
          <p>No meter readings recorded yet.</p>
        )}
        {primaryCompatibleMeter ? (
          <p><strong>Configured meter:</strong> {primaryCompatibleMeter.meter_type} ({primaryCompatibleMeter.unit}) current value: {primaryCompatibleMeter.current_value ?? '-'}</p>
        ) : (
          <p>No compatible meter configured yet.</p>
        )}
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

export function MeterReadingFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [meters, setMeters] = useState([])
  const [meterForm, setMeterForm] = useState({ unit: 'km', current_value: '' })
  const [readingForm, setReadingForm] = useState({ meter_id: '', reading_value: '', notes: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch(`/assets/${id}`), apiFetch(`/assets/${id}/meters`)])
      .then(([assetResult, meterResult]) => {
        setAsset(assetResult)
        setMeters(meterResult)
      })
      .catch((err) => setError(err.message || 'Unable to load meter details'))
  }, [id])

  const compatibleMeters = useMemo(() => meters.filter((meter) => meter.meter_type === asset?.interval_basis), [meters, asset])
  const primaryCompatibleMeter = compatibleMeters[compatibleMeters.length - 1]

  useEffect(() => {
    if (!primaryCompatibleMeter) {
      setReadingForm((current) => ({ ...current, meter_id: '' }))
      return
    }
    setReadingForm((current) => ({ ...current, meter_id: String(primaryCompatibleMeter.id) }))
  }, [primaryCompatibleMeter])

  async function createMeter(e) {
    e.preventDefault()
    await apiFetch(`/assets/${id}/meters`, {
      method: 'POST',
      body: JSON.stringify({
        meter_type: asset.interval_basis,
        unit: meterForm.unit,
        current_value: meterForm.current_value ? Number(meterForm.current_value) : null,
      }),
    })
    setMeterForm((current) => ({ ...current, current_value: '' }))
    const refreshedMeters = await apiFetch(`/assets/${id}/meters`)
    setMeters(refreshedMeters)
  }

  async function submitReading(e) {
    e.preventDefault()
    await apiFetch(`/assets/${id}/readings`, {
      method: 'POST',
      body: JSON.stringify({
        ...readingForm,
        meter_id: Number(readingForm.meter_id),
        reading_value: Number(readingForm.reading_value),
      }),
    })
    navigate(`/assets/${id}`)
  }

  return (
    <div className="grid">
      <form onSubmit={submitReading} className="card narrow-card">
        <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset?.name || 'Asset', to: `/assets/${id}` }, { label: 'Add meter reading' }]} />
        <h2>Add meter reading</h2>
        {error && <p className="error">{error}</p>}
        {asset && <p className="hint">Readings here must match the asset tracking basis: <strong>{METER_TYPE_LABELS[asset.interval_basis] || asset.interval_basis}</strong>.</p>}

        {!primaryCompatibleMeter ? (
          <p>No compatible meter exists yet. Create one below first.</p>
        ) : (
          <>
            <label htmlFor="reading-meter">Meter</label>
            <input id="reading-meter" value={`${primaryCompatibleMeter.meter_type} (${primaryCompatibleMeter.unit})`} disabled />

            <label htmlFor="reading-value">Reading Value</label>
            <input id="reading-value" required inputMode="decimal" value={readingForm.reading_value} onChange={(e) => setReadingForm({ ...readingForm, reading_value: e.target.value })} />

            <label htmlFor="reading-notes">Notes</label>
            <textarea id="reading-notes" rows={4} value={readingForm.notes} onChange={(e) => setReadingForm({ ...readingForm, notes: e.target.value })} />

            <div className="actions">
              <button type="submit">Save reading</button>
              <Link to={`/assets/${id}`}>Cancel</Link>
            </div>
          </>
        )}
      </form>

      {!primaryCompatibleMeter && asset && (
        <form onSubmit={createMeter} className="card narrow-card">
          <h2>Create compatible meter</h2>
          <label htmlFor="meter-type">Meter Type</label>
          <input id="meter-type" value={METER_TYPE_LABELS[asset.interval_basis] || asset.interval_basis} disabled />

          <label htmlFor="meter-unit">Unit</label>
          <input id="meter-unit" required value={meterForm.unit} onChange={(e) => setMeterForm({ ...meterForm, unit: e.target.value })} />

          <label htmlFor="meter-current">Current Value</label>
          <input id="meter-current" inputMode="decimal" value={meterForm.current_value} onChange={(e) => setMeterForm({ ...meterForm, current_value: e.target.value })} />

          <button type="submit">Create meter</button>
        </form>
      )}
    </div>
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
  const [form, setForm] = useState({ title: '', description: '', interval_mode: 'time', time_interval: 'weekly', usage_interval: '' })

  useEffect(() => {
    apiFetch(`/assets/${id}`)
      .then(setAsset)
      .catch((err) => setError(err.message || 'Unable to load asset details'))
  }, [id])

  async function submit(e) {
    e.preventDefault()
    setError('')
    const selectedTimeInterval = TIME_INTERVAL_OPTIONS.find((option) => option.value === form.time_interval)
    const intervalDays = form.interval_mode === 'time' ? selectedTimeInterval?.days ?? null : null
    const usageIntervalValue = form.interval_mode === 'usage' && form.usage_interval ? Number(form.usage_interval) : null

    const usagePayload = asset?.interval_basis === 'hours'
      ? { interval_hours: usageIntervalValue, interval_distance: null }
      : { interval_distance: usageIntervalValue, interval_hours: null }

    await apiFetch(`/assets/${id}/schedules`, {
      method: 'POST',
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        interval_days: intervalDays,
        ...usagePayload,
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

      <fieldset>
        <legend>Interval Type</legend>
        <label className="radio-label">
          <input
            type="radio"
            name="interval_mode"
            value="time"
            checked={form.interval_mode === 'time'}
            onChange={(e) => setForm({ ...form, interval_mode: e.target.value })}
          />
          Time interval
        </label>
        <label className="radio-label">
          <input
            type="radio"
            name="interval_mode"
            value="usage"
            checked={form.interval_mode === 'usage'}
            onChange={(e) => setForm({ ...form, interval_mode: e.target.value })}
          />
          Usage interval ({METER_TYPE_LABELS[asset?.interval_basis] || asset?.interval_basis})
        </label>
      </fieldset>

      {form.interval_mode === 'time' ? (
        <>
          <label htmlFor="schedule-time-interval">Time Interval</label>
          <select id="schedule-time-interval" value={form.time_interval} onChange={(e) => setForm({ ...form, time_interval: e.target.value })}>
            {TIME_INTERVAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </>
      ) : (
        <>
          <label htmlFor="schedule-usage-interval">Usage Interval ({METER_TYPE_LABELS[asset?.interval_basis] || asset?.interval_basis})</label>
          <input id="schedule-usage-interval" required inputMode="decimal" value={form.usage_interval} onChange={(e) => setForm({ ...form, usage_interval: e.target.value })} />
        </>
      )}

      <div className="actions">
        <button type="submit">Save schedule</button>
        <Link to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}
