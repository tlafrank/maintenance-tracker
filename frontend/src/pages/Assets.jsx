import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
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

function usageLabel(intervalBasis) {
  return METER_TYPE_LABELS[intervalBasis] || intervalBasis || 'Usage'
}

function formatIntervalValue(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return ''
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })
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
  return new Date(normalizedDate).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatReadingDateTime(isoDateString) {
  if (!isoDateString) return ''
  const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(isoDateString)
  const normalizedDate = hasTimezone ? isoDateString : `${isoDateString}Z`
  return new Date(normalizedDate).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function intervalPeriodLabel(intervalDays) {
  const mapping = {
    7: 'Weekly',
    14: 'Fortnightly',
    30: 'Monthly',
    91: 'Quarterly',
    182: 'Twice-yearly',
    365: 'Annually',
    730: 'Two-yearly',
    1825: 'Five-yearly',
  }
  return mapping[intervalDays] || (intervalDays ? `Every ${intervalDays} days` : '')
}

function humanDueText(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return 'No due date'
  if (daysLeft === -14) return 'Two weeks past due'
  if (daysLeft < -14) return `${Math.abs(daysLeft)} days past due`
  if (daysLeft < -6) return 'Overdue by one week'
  if (daysLeft < 0) return `${Math.abs(daysLeft)} days past due`
  if (daysLeft === 0) return 'Due today'
  if (daysLeft <= 7) return 'Due next week'
  if (daysLeft <= 30) return `Due in ${Math.ceil(daysLeft / 7)} weeks`
  if (daysLeft <= 365) return `Due in ${Math.ceil(daysLeft / 30)} months`
  return `Due in ${Math.ceil(daysLeft / 365)} years`
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

        <button className="btn btn-primary" type="submit" disabled={!canSubmitAsset}>Save</button>
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
        <button className="btn btn-outline-primary" type="submit" disabled={isSavingAssetType}>{isSavingAssetType ? 'Saving...' : 'Add type'}</button>
      </form>
    </div>
  )
}

export function AssetEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
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

  useEffect(() => {
    apiFetch(`/assets/${id}`)
      .then((asset) => setForm({
        name: asset.name || '',
        asset_type: asset.asset_type || '',
        manufacturer: asset.manufacturer || '',
        model: asset.model || '',
        year: asset.year ?? '',
        registration_or_serial: asset.registration_or_serial || '',
        notes: asset.notes || '',
        interval_basis: asset.interval_basis || 'distance',
      }))
      .catch((err) => setError(err.message || 'Unable to load asset'))
  }, [id])

  async function submit(e) {
    e.preventDefault()
    setError('')
    await apiFetch(`/assets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...form,
        year: form.year ? Number(form.year) : null,
      }),
    })
    navigate(`/assets/${id}`)
  }

  return (
    <form onSubmit={submit} className="card narrow-card">
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: form.name || 'Asset', to: `/assets/${id}` }, { label: 'Edit Asset' }]} />
      <h2>Edit Asset</h2>
      {error && <p className="error">{error}</p>}

      <label htmlFor="edit-asset-name">Asset Name</label>
      <input id="edit-asset-name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

      <label htmlFor="edit-asset-type">Asset Type</label>
      <input id="edit-asset-type" required value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })} />

      <label htmlFor="edit-asset-manufacturer">Manufacturer</label>
      <input id="edit-asset-manufacturer" value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} />

      <label htmlFor="edit-asset-model">Model</label>
      <input id="edit-asset-model" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />

      <label htmlFor="edit-asset-year">Year</label>
      <input id="edit-asset-year" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} inputMode="numeric" />

      <label htmlFor="edit-asset-registration">Registration / Serial Number</label>
      <input id="edit-asset-registration" value={form.registration_or_serial} onChange={e => setForm({ ...form, registration_or_serial: e.target.value })} />

      <fieldset>
        <legend>Usage Interval Basis</legend>
        {INTERVAL_BASIS_OPTIONS.map((option) => (
          <label key={option.value} className="radio-label">
            <input
              type="radio"
              name="edit_interval_basis"
              value={option.value}
              checked={form.interval_basis === option.value}
              onChange={e => setForm({ ...form, interval_basis: e.target.value })}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <label htmlFor="edit-asset-notes">Notes</label>
      <textarea id="edit-asset-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={5} />

      <div className="actions">
        <button className="btn btn-primary" type="submit">Save changes</button>
        <Link className="btn btn-outline-secondary" to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
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
  const latestReadingMeter = meters.find((meter) => meter.id === latestReading?.meter_id)
  const usageTypeLabel = usageLabel(asset?.interval_basis)

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
          <Link className="action-button btn btn-outline-primary" to={`/assets/${id}/edit`}>Edit Asset</Link>
          <Link className="action-button btn btn-outline-primary" to={`/assets/${id}/readings/new`}>{`Update Asset ${usageTypeLabel}`}</Link>
          <Link className="action-button btn btn-outline-primary" to={`/assets/${id}/schedules/new`}>Add Scheduled Maintenance Task</Link>
          <Link className="action-button btn btn-outline-primary" to={`/assets/${id}/maintenance-events/new`}>Record Maintenance Activity</Link>
        </div>
      </section>
      <section className="card">
        <h3>Meters</h3>
        {latestReading ? (
          <div className="meter-highlight">
            <p><strong>Last reading:</strong> {latestReading.reading_value} {latestReadingMeter?.unit || ''}</p>
            <p className="muted-text">{formatReadingDate(latestReading.reading_timestamp)} · {relativeTimeFromNow(latestReading.reading_timestamp)}</p>
          </div>
        ) : (
          <p>No meter readings recorded yet.</p>
        )}
      </section>
      <section className="card">
        <h3>Scheduled Maintenance Tasks</h3>
        {schedules.map((schedule) => {
          const lastMatchingEvent = events.find((event) => event.event_type.split(',').map((task) => task.trim().toLowerCase()).includes(schedule.title.trim().toLowerCase()))
          const referenceDate = lastMatchingEvent ? new Date(lastMatchingEvent.performed_at) : new Date()
          const dueDate = schedule.interval_days ? new Date(referenceDate.getTime() + (schedule.interval_days * 24 * 60 * 60 * 1000)) : null
          const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
          const status = daysLeft === null ? 'future' : (daysLeft < 0 ? 'overdue' : (daysLeft <= 14 ? 'upcoming' : 'future'))
          const usageUnit = asset.interval_basis === 'distance' ? 'km' : asset.interval_basis
          const intervalParts = [intervalPeriodLabel(schedule.interval_days)]
          if (schedule.interval_distance) intervalParts.push(`Every ${formatIntervalValue(schedule.interval_distance)} ${usageUnit}`)
          if (schedule.interval_hours) intervalParts.push(`Every ${formatIntervalValue(schedule.interval_hours)} hours`)
          const intervalSummary = intervalParts.filter(Boolean).join(' | ')
          return (
            <div key={schedule.id} className="schedule-card">
              <Link to={`/assets/${id}/schedules/${schedule.id}/edit`}><strong>{schedule.title}</strong></Link>
              <p className="muted-text">{intervalSummary}</p>
              {daysLeft !== null && <p className="muted-text">{humanDueText(daysLeft)}</p>}
              <span className={`badge status-${status}`}>{status}</span>
            </div>
          )
        })}
      </section>
      <section className="card">
        <h3>Maintenance history</h3>
        {events.map((ev) => (
          <div key={ev.id} className="meter-highlight">
            <p><Link to={`/assets/${id}/maintenance-events/new?edit=${ev.id}`}><strong>{formatReadingDate(ev.performed_at)}</strong></Link> {ev.completion_meter_value !== null ? `@ ${formatIntervalValue(ev.completion_meter_value)} km` : ''}</p>
            <div className="badges">
              {ev.event_type.split(',').map((task) => {
                const trimmedTask = task.trim()
                return trimmedTask ? <span key={`${ev.id}-${trimmedTask}`} className="badge">{trimmedTask}</span> : null
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

export function MeterReadingFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [meters, setMeters] = useState([])
  const [readings, setReadings] = useState([])
  const [readingForm, setReadingForm] = useState({ meter_id: '', reading_value: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch(`/assets/${id}`), apiFetch(`/assets/${id}/meters`), apiFetch(`/assets/${id}/readings`)])
      .then(([assetResult, meterResult, readingResult]) => {
        setAsset(assetResult)
        setMeters(meterResult)
        setReadings(readingResult)
      })
      .catch((err) => setError(err.message || 'Unable to load meter details'))
  }, [id])

  const compatibleMeters = useMemo(() => meters.filter((meter) => meter.meter_type === asset?.interval_basis), [meters, asset])
  const primaryCompatibleMeter = compatibleMeters[compatibleMeters.length - 1]
  const latestReading = readings[0]
  const usageTypeLabel = usageLabel(asset?.interval_basis)

  useEffect(() => {
    if (!primaryCompatibleMeter) {
      setReadingForm((current) => ({ ...current, meter_id: '' }))
      return
    }
    setReadingForm((current) => ({ ...current, meter_id: String(primaryCompatibleMeter.id) }))
  }, [primaryCompatibleMeter])

  async function submitReading(e) {
    e.preventDefault()
    let targetMeterId = readingForm.meter_id
    const nextReadingValue = Number(readingForm.reading_value)
    if (primaryCompatibleMeter?.current_value !== null && primaryCompatibleMeter?.current_value !== undefined && nextReadingValue < Number(primaryCompatibleMeter.current_value)) {
      const confirmed = window.confirm('The new meter reading is lower than the current meter value. Confirm this is correct to continue.')
      if (!confirmed) return
    }
    if (!primaryCompatibleMeter) {
      const createdMeter = await apiFetch(`/assets/${id}/meters`, {
        method: 'POST',
        body: JSON.stringify({
          meter_type: asset.interval_basis,
          unit: asset.interval_basis === 'distance' ? 'km' : asset.interval_basis,
          current_value: null,
        }),
      })
      targetMeterId = String(createdMeter.id)
    }
    await apiFetch(`/assets/${id}/readings`, {
      method: 'POST',
      body: JSON.stringify({
        ...readingForm,
        meter_id: Number(targetMeterId),
        reading_value: nextReadingValue,
      }),
    })
    navigate(`/assets/${id}`)
  }

  return (
    <form onSubmit={submitReading} className="card narrow-card">
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset?.name || 'Asset', to: `/assets/${id}` }, { label: `Update Asset ${usageTypeLabel}` }]} />
      <h2>{`Update Asset ${usageTypeLabel}`}</h2>
      {error && <p className="error">{error}</p>}
      {asset && <p className="hint">Readings are tracked as {METER_TYPE_LABELS[asset.interval_basis] || asset.interval_basis} for this asset.</p>}

      {primaryCompatibleMeter && (
        <>
          <label htmlFor="reading-meter">Current Meter</label>
          <input id="reading-meter" value={`${METER_TYPE_LABELS[primaryCompatibleMeter.meter_type] || primaryCompatibleMeter.meter_type} (${primaryCompatibleMeter.unit})`} disabled />
        </>
      )}

      {latestReading && <p className="muted-text">Last recorded {formatReadingDateTime(latestReading.reading_timestamp)} · {relativeTimeFromNow(latestReading.reading_timestamp)}</p>}
      {primaryCompatibleMeter?.current_value !== null && primaryCompatibleMeter?.current_value !== undefined && (
        <p className="muted-text">Current meter value: {formatIntervalValue(primaryCompatibleMeter.current_value)}</p>
      )}

      <label htmlFor="reading-value">New Meter Reading</label>
      <input id="reading-value" required inputMode="decimal" value={readingForm.reading_value} onChange={(e) => setReadingForm({ ...readingForm, reading_value: e.target.value })} />

      <div className="actions">
        <button className="btn btn-primary" type="submit">Save reading</button>
        <Link className="btn btn-outline-secondary" to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}

export function MaintenanceEventFormPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const editEventId = searchParams.get('edit')
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [form, setForm] = useState({ completion_meter_value: '', notes: '' })
  const [taskInput, setTaskInput] = useState('')
  const [tasks, setTasks] = useState([])
  const [taskSuggestions, setTaskSuggestions] = useState([])
  const [taskRename, setTaskRename] = useState({ old_name: '', new_name: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch(`/assets/${id}`), apiFetch('/maintenance-tasks')])
      .then(([assetResult, suggestions]) => {
        setAsset(assetResult)
        setTaskSuggestions(suggestions.map((suggestion) => suggestion.task_name))
      })
      .catch((err) => setError(err.message || 'Unable to load asset details'))
  }, [id])
  useEffect(() => {
    if (!editEventId) return
    apiFetch(`/assets/${id}/maintenance-events`).then((events) => {
      const event = events.find((candidate) => String(candidate.id) === String(editEventId))
      if (!event) return
      setTasks(event.event_type.split(',').map((task) => task.trim()).filter(Boolean))
      setForm({ completion_meter_value: event.completion_meter_value ?? '', notes: event.notes ?? '' })
    })
  }, [id, editEventId])

  function addTask(taskValue) {
    const trimmed = taskValue.trim()
    if (!trimmed) return
    setTasks((current) => {
      if (current.some((task) => task.toLowerCase() === trimmed.toLowerCase())) return current
      return [...current, trimmed]
    })
    setTaskInput('')
  }

  function tasksWithPendingInput() {
    const pendingTask = taskInput.trim()
    if (!pendingTask) return tasks
    if (tasks.some((task) => task.toLowerCase() === pendingTask.toLowerCase())) return tasks
    return [...tasks, pendingTask]
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const mergedTasks = tasksWithPendingInput()
    if (mergedTasks.length === 0) {
      setError('Add at least one maintenance task.')
      return
    }
    setTasks(mergedTasks)
    setTaskInput('')
    const payload = {
      event_type: mergedTasks.join(', '),
      notes: form.notes?.trim() || null,
      completion_meter_value: form.completion_meter_value ? Number(form.completion_meter_value) : null,
    }
    await apiFetch(editEventId ? `/maintenance-events/${editEventId}` : `/assets/${id}/maintenance-events`, {
      method: editEventId ? 'PUT' : 'POST',
      body: JSON.stringify({
        ...payload,
      }),
    })
    navigate(`/assets/${id}`)
  }

  async function renameTask(e) {
    e.preventDefault()
    if (!taskRename.old_name.trim() || !taskRename.new_name.trim()) return
    await apiFetch('/maintenance-tasks/rename', {
      method: 'PUT',
      body: JSON.stringify(taskRename),
    })
    setTaskSuggestions((current) => current.map((task) => (
      task.toLowerCase() === taskRename.old_name.trim().toLowerCase() ? taskRename.new_name.trim() : task
    )))
    setTasks((current) => current.map((task) => (
      task.toLowerCase() === taskRename.old_name.trim().toLowerCase() ? taskRename.new_name.trim() : task
    )))
    setTaskRename({ old_name: '', new_name: '' })
  }

  return (
    <form onSubmit={submit} className="card narrow-card">
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset?.name || 'Asset', to: `/assets/${id}` }, { label: 'Record Maintenance Activity' }]} />
      <h2>Record Maintenance Activity</h2>
      {asset && <p className="hint">Capture completed work for <strong>{asset.name}</strong>.</p>}
      {error && <p className="error">{error}</p>}

      <label htmlFor="task-input">Maintenance Tasks</label>
      <div className="task-input-box">
        {tasks.map((task) => (
          <span key={task} className="badge">
            {task}
            <button
              type="button"
              className="badge-remove"
              onClick={() => setTasks((current) => current.filter((value) => value !== task))}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="task-inline-input"
          id="task-input"
          list="task-options"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === ',') {
              e.preventDefault()
              addTask(taskInput)
            }
          }}
        />
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => addTask(taskInput)}>
          Add Task
        </button>
      </div>
      <datalist id="task-options">
        {taskSuggestions.map((task) => <option key={task} value={task} />)}
      </datalist>
      <p className="hint">Type a task and press comma to add it. Click a badge to remove it.</p>
      <label htmlFor="completion-meter">{`Current Asset ${usageLabel(asset?.interval_basis)}`}</label>
      <input id="completion-meter" inputMode="decimal" value={form.completion_meter_value} onChange={(e) => setForm({ ...form, completion_meter_value: e.target.value })} />
      <label htmlFor="maintenance-notes">Notes</label>
      <textarea id="maintenance-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

      <fieldset>
        <legend>Rename Existing Task</legend>
        <label htmlFor="rename-old-task">Current task name</label>
        <input id="rename-old-task" list="task-options" value={taskRename.old_name} onChange={(e) => setTaskRename((current) => ({ ...current, old_name: e.target.value }))} />
        <label htmlFor="rename-new-task">New task name</label>
        <input id="rename-new-task" value={taskRename.new_name} onChange={(e) => setTaskRename((current) => ({ ...current, new_name: e.target.value }))} />
        <button className="btn btn-outline-primary" type="button" onClick={renameTask}>Rename Task</button>
      </fieldset>

      <div className="actions">
        <button className="btn btn-primary" type="submit" disabled={tasks.length === 0 && !taskInput.trim()}>{editEventId ? 'Update Activity' : 'Record Maintenance Activity'}</button>
        <Link className="btn btn-outline-secondary" to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}

export function ScheduleFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [error, setError] = useState('')
  const [activitySuggestions, setActivitySuggestions] = useState([])
  const [existingScheduleTitles, setExistingScheduleTitles] = useState([])
  const [form, setForm] = useState({ title: '', description: '', time_interval: '', usage_interval: '' })

  useEffect(() => {
    Promise.all([
      apiFetch(`/assets/${id}`),
      apiFetch('/maintenance-tasks'),
      apiFetch(`/assets/${id}/schedules`),
    ])
      .then(([assetResult, suggestions, schedules]) => {
        setAsset(assetResult)
        setActivitySuggestions(suggestions.map((suggestion) => ({ activity_name: suggestion.task_name })))
        setExistingScheduleTitles(schedules.map((schedule) => schedule.title.trim().toLowerCase()))
      })
      .catch((err) => setError(err.message || 'Unable to load asset details'))
  }, [id])

  async function submit(e) {
    e.preventDefault()
    setError('')
    const selectedTimeInterval = TIME_INTERVAL_OPTIONS.find((option) => option.value === form.time_interval)
    const intervalDays = selectedTimeInterval?.days ?? null
    const usageIntervalValue = form.usage_interval ? Number(form.usage_interval) : null
    if (intervalDays === null && usageIntervalValue === null) {
      setError('Select a time interval and/or enter a usage interval.')
      return
    }

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
      {asset && <p className="hint">Create a recurring schedule for one maintenance task on <strong>{asset.name}</strong>.</p>}
      {error && <p className="error">{error}</p>}

      <label htmlFor="schedule-title">Maintenance Task</label>
      <input id="schedule-title" list="scheduled-activity-options" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <datalist id="scheduled-activity-options">
        {activitySuggestions
          .filter((suggestion) => !existingScheduleTitles.includes(suggestion.activity_name.trim().toLowerCase()))
          .map((suggestion) => <option key={suggestion.activity_name} value={suggestion.activity_name} />)}
      </datalist>

      <label htmlFor="schedule-description">Description</label>
      <textarea id="schedule-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <label htmlFor="schedule-time-interval">Time Interval (optional)</label>
      <select id="schedule-time-interval" value={form.time_interval} onChange={(e) => setForm({ ...form, time_interval: e.target.value })}>
        <option value="">No time interval</option>
        {TIME_INTERVAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      <label htmlFor="schedule-usage-interval">Usage Interval (optional, {METER_TYPE_LABELS[asset?.interval_basis] || asset?.interval_basis})</label>
      <input id="schedule-usage-interval" inputMode="decimal" value={form.usage_interval} onChange={(e) => setForm({ ...form, usage_interval: e.target.value })} />

      <div className="actions">
        <button className="btn btn-primary" type="submit">Save schedule</button>
        <Link className="btn btn-outline-secondary" to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}

export function ScheduleEditPage() {
  const { id, scheduleId } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', interval_days: '', interval_distance: '', interval_hours: '' })
  const [schedule, setSchedule] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch(`/assets/${id}/schedules`)
      .then((schedules) => {
        const found = schedules.find((candidate) => String(candidate.id) === String(scheduleId))
        if (!found) throw new Error('Schedule not found')
        setSchedule(found)
        setForm({
          title: found.title,
          description: found.description || '',
          interval_days: found.interval_days ?? '',
          interval_distance: found.interval_distance ?? '',
          interval_hours: found.interval_hours ?? '',
        })
      })
      .catch((err) => setError(err.message || 'Unable to load schedule'))
  }, [id, scheduleId])

  async function submit(e) {
    e.preventDefault()
    if (!schedule) return
    await apiFetch(`/schedules/${schedule.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...schedule,
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
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: 'Edit scheduled task' }]} />
      <h2>Edit scheduled maintenance task</h2>
      {error && <p className="error">{error}</p>}
      <label htmlFor="edit-schedule-title">Maintenance Task</label>
      <input id="edit-schedule-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <label htmlFor="edit-schedule-description">Description</label>
      <textarea id="edit-schedule-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <label htmlFor="edit-schedule-days">Interval (days)</label>
      <input id="edit-schedule-days" inputMode="numeric" value={form.interval_days} onChange={(e) => setForm({ ...form, interval_days: e.target.value })} />
      <label htmlFor="edit-schedule-usage">Interval (usage)</label>
      <input id="edit-schedule-usage" inputMode="decimal" value={form.interval_distance} onChange={(e) => setForm({ ...form, interval_distance: e.target.value })} />
      <label htmlFor="edit-schedule-hours">Interval (hours)</label>
      <input id="edit-schedule-hours" inputMode="decimal" value={form.interval_hours} onChange={(e) => setForm({ ...form, interval_hours: e.target.value })} />
      <div className="actions">
        <button className="btn btn-primary" type="submit">Save changes</button>
        <Link className="btn btn-outline-secondary" to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}
