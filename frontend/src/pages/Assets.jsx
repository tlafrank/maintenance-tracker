import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { apiFetch } from '../api/client'

const SERVICE_TRIGGER_OPTIONS = [
  { value: 'distance', label: 'Distance' },
  { value: 'hours', label: 'Hours' },
  { value: 'cycles', label: 'Cycles' },
]

const SERVICE_TRIGGER_LABELS = {
  distance: 'Distance',
  hours: 'Hours',
  cycles: 'Cycles',
}

function usageLabel(serviceTrigger) {
  return SERVICE_TRIGGER_LABELS[serviceTrigger] || serviceTrigger || 'Usage'
}

function usageUnit(serviceTrigger) {
  if (serviceTrigger === 'distance') return 'km'
  if (serviceTrigger === 'hours') return 'h'
  if (serviceTrigger === 'cycles') return 'cycles'
  return ''
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

function timeIntervalValueFromDays(intervalDays) {
  const option = TIME_INTERVAL_OPTIONS.find((candidate) => candidate.days === Number(intervalDays))
  return option?.value || ''
}

function localDateInputValue() {
  const now = new Date()
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10)
}

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

function formatLongDate(isoDateString) {
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
  if (daysLeft === null || daysLeft === undefined || Number.isNaN(daysLeft)) return 'No due date'
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

function usageRemainingText(remainingUsage, serviceTrigger) {
  if (remainingUsage === null || remainingUsage === undefined || Number.isNaN(remainingUsage)) return ''
  if (remainingUsage <= 0) return `${Math.abs(Math.round(remainingUsage)).toLocaleString('en-US')} ${usageUnit(serviceTrigger)} overdue`
  return `${Math.round(remainingUsage).toLocaleString('en-US')} ${usageUnit(serviceTrigger)}`
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

function AssetThumbnail({ thumbnailPath, alt, className = 'asset-thumbnail' }) {
  if (!thumbnailPath) return <div className={`${className} asset-thumbnail-placeholder`} aria-hidden="true">No image</div>
  return <img className={className} src={`/api${thumbnailPath}`} alt={alt} />
}

export function AssetListPage() {
  const [assets, setAssets] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [selectedType, setSelectedType] = useState('all')

  useEffect(() => {
    Promise.all([apiFetch('/assets'), apiFetch('/asset-types')]).then(([assetResult, typeResult]) => {
      setAssets(assetResult)
      setAssetTypes(typeResult)
    })
  }, [])

  const filteredAssets = selectedType === 'all'
    ? assets
    : assets.filter((assetItem) => assetItem.asset_type === selectedType)

  return (
    <div className="grid">
      <section className="card span-all">
        <h2>Assets</h2>
        <div className="equal-actions">
          <Link className="btn btn-outline-primary equal-action-btn" to="/assets/new">Add Asset</Link>
        </div>
        <label htmlFor="asset-type-filter">Filter by asset type</label>
        <select id="asset-type-filter" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
          <option value="all">All types</option>
          {assetTypes.map((assetType) => <option key={assetType.id} value={assetType.name}>{assetType.name}</option>)}
        </select>
      </section>
      <section className="card span-all">
        {assets.length === 0 && <p className="muted-text">No assets yet. Use Add Asset to get started.</p>}
        {assets.length > 0 && filteredAssets.length === 0 && <p className="muted-text">No assets match this filter.</p>}
        <div className="asset-list">
          {filteredAssets.map((assetItem) => (
            <Link key={assetItem.id} to={`/assets/${assetItem.id}`} className="asset-list-item">
              <AssetThumbnail thumbnailPath={assetItem.thumbnail_path} alt={`${assetItem.name} thumbnail`} className="asset-list-thumbnail" />
              <div>
                <strong>{assetItem.name}</strong>
                <p className="muted-text asset-type-label">{assetItem.asset_type}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export function AssetFormPage() {
  const navigate = useNavigate()
  const [assetTypes, setAssetTypes] = useState([])
  const [newAssetType, setNewAssetType] = useState('')
  const [isSavingAssetType, setIsSavingAssetType] = useState(false)
  const [error, setError] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [form, setForm] = useState({
    name: '',
    asset_type: '',
    manufacturer: '',
    model: '',
    year: '',
    registration_or_serial: '',
    notes: '',
    service_trigger: 'distance',
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
    const createdAsset = await apiFetch('/assets', {
      method: 'POST',
      body: JSON.stringify({
        ...form,
        year: form.year ? Number(form.year) : null,
      }),
    })
    if (selectedImage) {
      const imageData = new FormData()
      imageData.append('file', selectedImage)
      await apiFetch(`/assets/${createdAsset.id}/thumbnail`, { method: 'POST', body: imageData })
    }
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
          <legend>Service Trigger</legend>
          <p className="hint">Choose what usage this asset accumulates for usage-based maintenance.</p>
          {SERVICE_TRIGGER_OPTIONS.map((option) => (
            <label key={option.value} className="radio-label">
              <input
                type="radio"
                name="service_trigger"
                value={option.value}
                checked={form.service_trigger === option.value}
                onChange={e => setForm({ ...form, service_trigger: e.target.value })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>

        <label htmlFor="asset-notes">Notes</label>
        <textarea id="asset-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={5} />

        <label htmlFor="asset-image">Asset Image</label>
        <input id="asset-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => setSelectedImage(e.target.files?.[0] || null)} />

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
  const [selectedImage, setSelectedImage] = useState(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [form, setForm] = useState({
    name: '',
    asset_type: '',
    manufacturer: '',
    model: '',
    year: '',
    registration_or_serial: '',
    notes: '',
    service_trigger: 'distance',
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
        service_trigger: asset.service_trigger || 'distance',
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
    if (selectedImage) {
      setIsUploadingImage(true)
      const imageData = new FormData()
      imageData.append('file', selectedImage)
      await apiFetch(`/assets/${id}/thumbnail`, { method: 'POST', body: imageData })
    }
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
        <legend>Service Trigger</legend>
        {SERVICE_TRIGGER_OPTIONS.map((option) => (
          <label key={option.value} className="radio-label">
            <input
              type="radio"
              name="edit_service_trigger"
              value={option.value}
              checked={form.service_trigger === option.value}
              onChange={e => setForm({ ...form, service_trigger: e.target.value })}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <label htmlFor="edit-asset-notes">Notes</label>
      <textarea id="edit-asset-notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={5} />
      <label htmlFor="edit-asset-image">Replace asset image</label>
      <input id="edit-asset-image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => setSelectedImage(e.target.files?.[0] || null)} />

      <div className="actions">
        <button className="btn btn-primary" type="submit">{isUploadingImage ? 'Saving image...' : 'Save service interval'}</button>
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
  const [historySearch, setHistorySearch] = useState('')
  const [thumbnailUploadError, setThumbnailUploadError] = useState('')
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)

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
  const compatibleMeters = useMemo(() => meters.filter((meter) => meter.service_trigger === asset?.service_trigger), [meters, asset])
  const latestReadingMeter = meters.find((meter) => meter.id === latestReading?.meter_id)
  const usageTypeLabel = usageLabel(asset?.service_trigger)
  const filteredEvents = useMemo(() => {
    const normalizedSearch = historySearch.trim().toLowerCase()
    if (!normalizedSearch) return events
    const searchTerms = normalizedSearch.split(/\s+/).filter(Boolean)
    return events.filter((event) => {
      const searchableContent = `${event.event_type || ''} ${event.notes || ''}`.toLowerCase()
      return searchTerms.every((term) => searchableContent.includes(term))
    })
  }, [events, historySearch])

  if (!asset) return <p>Loading...</p>

  async function uploadThumbnail(file) {
    if (!file) return
    setThumbnailUploadError('')
    setIsUploadingThumbnail(true)
    try {
      const imageData = new FormData()
      imageData.append('file', file)
      const updatedAsset = await apiFetch(`/assets/${id}/thumbnail`, { method: 'POST', body: imageData })
      setAsset(updatedAsset)
    } catch (err) {
      setThumbnailUploadError(err.message || 'Unable to upload image')
    } finally {
      setIsUploadingThumbnail(false)
    }
  }

  return (
    <div className="grid">
      <section className="card span-all">
        <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset.name }]} />
        <div className="asset-header">
          <AssetThumbnail thumbnailPath={asset.thumbnail_path} alt={`${asset.name} thumbnail`} />
          <div>
            <h2>{asset.name} <Link className="muted-edit-link" to={`/assets/${id}/edit`}>(edit)</Link></h2>
            <label htmlFor="asset-thumbnail-upload" className="hint">Update image</label>
            <input
              id="asset-thumbnail-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(e) => uploadThumbnail(e.target.files?.[0] || null)}
              disabled={isUploadingThumbnail}
            />
            {thumbnailUploadError && <p className="error">{thumbnailUploadError}</p>}
          </div>
        </div>
        <p>{asset.asset_type}</p>
        {asset.notes && <p>{asset.notes}</p>}
      </section>
      <section className="card span-all">
        <h3>Maintenance actions</h3>
        <p className="hint">Use actions below to record work and manage maintenance schedules.</p>
        <div className="actions">
          <Link className="action-button btn btn-outline-primary" to={`/assets/${id}/readings/new`}>{`Update Asset ${usageTypeLabel}`}</Link>
          <Link className="action-button btn btn-outline-primary" to={`/assets/${id}/schedules/new`}>Add Scheduled Maintenance Task</Link>
          <Link className="action-button btn btn-outline-primary" to={`/assets/${id}/maintenance-events/new`}>Record Maintenance Activity</Link>
        </div>
      </section>
      <section className="card">
        <h3>Current Reading</h3>
        {latestReading ? (
          <div className="meter-highlight">
            <p><strong>{`Current ${usageLabel(asset.service_trigger)}`}:</strong> {formatIntervalValue(latestReading.reading_value)} {latestReadingMeter?.unit || usageUnit(asset.service_trigger)}</p>
            <p className="muted-text">{formatReadingDate(latestReading.reading_timestamp)} · {relativeTimeFromNow(latestReading.reading_timestamp)}</p>
          </div>
        ) : (
          <p>No readings recorded yet.</p>
        )}
      </section>
      <section className="card">
        <h3>Scheduled Maintenance Tasks</h3>
        {schedules.map((schedule) => {
          const lastMatchingEvent = events.find((event) => event.event_type.split(',').map((task) => task.trim().toLowerCase()).includes(schedule.title.trim().toLowerCase()))
          const referenceDate = lastMatchingEvent ? new Date(lastMatchingEvent.performed_at) : new Date(asset.created_at)
          const dueDate = schedule.interval_days ? new Date(referenceDate.getTime() + (schedule.interval_days * 24 * 60 * 60 * 1000)) : null
          const daysLeft = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null
          const usageInterval = asset.service_trigger === 'distance'
            ? schedule.interval_distance
            : asset.service_trigger === 'hours'
              ? schedule.interval_hours
              : schedule.interval_cycles
          const currentReading = latestReading?.reading_value !== null && latestReading?.reading_value !== undefined
            ? Number(latestReading.reading_value)
            : null
          const usageBaseline = lastMatchingEvent?.completion_meter_value !== null && lastMatchingEvent?.completion_meter_value !== undefined
            ? Number(lastMatchingEvent.completion_meter_value)
            : 0
          const usageDueAt = usageInterval !== null && usageInterval !== undefined ? usageBaseline + Number(usageInterval) : null
          const usageRemaining = usageDueAt !== null && currentReading !== null ? usageDueAt - currentReading : null
          const isUsageOverdue = usageRemaining !== null && usageRemaining <= 0
          const isTimeOverdue = daysLeft !== null && !Number.isNaN(daysLeft) && daysLeft < 0
          const isTimeUpcoming = daysLeft !== null && !Number.isNaN(daysLeft) && daysLeft >= 0 && daysLeft <= 14
          const isUsageUpcoming = usageRemaining !== null && usageRemaining > 0 && usageInterval && usageRemaining <= Number(usageInterval) * 0.2
          const status = (isTimeOverdue || isUsageOverdue) ? 'overdue' : ((isTimeUpcoming || isUsageUpcoming) ? 'upcoming' : 'future')
          const intervalParts = [intervalPeriodLabel(schedule.interval_days)]
          if (usageInterval) intervalParts.push(`Every ${formatIntervalValue(usageInterval)} ${usageUnit(asset.service_trigger)}`)
          const intervalSummary = intervalParts.filter(Boolean).join(' | ')
          let dueSummary = ''
          if (daysLeft !== null && usageRemaining !== null) {
            dueSummary = `${humanDueText(daysLeft)} or ${usageRemainingText(usageRemaining, asset.service_trigger)}`
          } else if (daysLeft !== null) {
            dueSummary = humanDueText(daysLeft)
          } else if (usageRemaining !== null) {
            dueSummary = usageRemaining <= 0
              ? `${Math.abs(Math.round(usageRemaining)).toLocaleString('en-US')} ${usageUnit(asset.service_trigger)} overdue`
              : `Due in ${usageRemainingText(usageRemaining, asset.service_trigger)}`
          }
          return (
            <div key={schedule.id} className="schedule-card">
              <Link to={`/assets/${id}/schedules/${schedule.id}/edit`}><strong>{schedule.title}</strong></Link>
              <p className="muted-text">{intervalSummary}</p>
              {dueSummary && <p className="muted-text">{dueSummary}</p>}
              <span className={`badge status-${status}`}>{status}</span>
            </div>
          )
        })}
      </section>
      <section className="card">
        <h3>Maintenance history</h3>
        <input
          aria-label="Search maintenance history"
          placeholder="Search tasks or notes"
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
        />
        {filteredEvents.length === 0 && <p className="muted-text">No maintenance activities match your search.</p>}
        {filteredEvents.map((ev) => (
          <div key={ev.id} className="meter-highlight">
            <p><Link to={`/assets/${id}/maintenance-events/new?edit=${ev.id}`}><strong>{formatReadingDate(ev.performed_at)}</strong></Link> {ev.completion_meter_value !== null ? `@ ${formatIntervalValue(ev.completion_meter_value)} ${usageUnit(asset.service_trigger)}` : ''}</p>
            <div className="badges">
              {ev.event_type.split(',').map((task) => {
                const trimmedTask = task.trim()
                return trimmedTask ? <span key={`${ev.id}-${trimmedTask}`} className="badge">{trimmedTask}</span> : null
              })}
            </div>
            {ev.notes && <p className="muted-text">{ev.notes}</p>}
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
      .catch((err) => setError(err.message || 'Unable to load reading details'))
  }, [id])

  const compatibleMeters = useMemo(() => meters.filter((meter) => meter.service_trigger === asset?.service_trigger), [meters, asset])
  const primaryCompatibleMeter = compatibleMeters[compatibleMeters.length - 1]
  const latestReading = readings[0]
  const usageTypeLabel = usageLabel(asset?.service_trigger)

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
      const confirmed = window.confirm('The new reading is lower than the current reading value. Confirm this is correct to continue.')
      if (!confirmed) return
    }
    if (!primaryCompatibleMeter) {
      const createdMeter = await apiFetch(`/assets/${id}/meters`, {
        method: 'POST',
        body: JSON.stringify({
          service_trigger: asset.service_trigger,
          unit: usageUnit(asset.service_trigger),
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
      {asset && <p className="hint">{`Service Trigger: ${usageLabel(asset.service_trigger)} (${usageUnit(asset.service_trigger)})`}</p>}

      {primaryCompatibleMeter && (
        <>
          <label htmlFor="reading-meter">Service Trigger Reading Source</label>
          <input id="reading-meter" value={`${SERVICE_TRIGGER_LABELS[primaryCompatibleMeter.service_trigger] || primaryCompatibleMeter.service_trigger} (${primaryCompatibleMeter.unit})`} disabled />
        </>
      )}

      {latestReading && <p className="muted-text">Last recorded {formatReadingDateTime(latestReading.reading_timestamp)} · {relativeTimeFromNow(latestReading.reading_timestamp)}</p>}
      {primaryCompatibleMeter?.current_value !== null && primaryCompatibleMeter?.current_value !== undefined && (
        <p className="muted-text">{`Current ${usageLabel(asset?.service_trigger)}: ${formatIntervalValue(primaryCompatibleMeter.current_value)} ${usageUnit(asset?.service_trigger)}`}</p>
      )}

      <label htmlFor="reading-value">{`New ${usageLabel(asset?.service_trigger)} Reading`}</label>
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
  const prefillTask = searchParams.get('task')
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [meters, setMeters] = useState([])
  const [form, setForm] = useState({ completion_meter_value: '', notes: '', performed_date: localDateInputValue() })
  const [taskInput, setTaskInput] = useState('')
  const [tasks, setTasks] = useState([])
  const [taskSuggestions, setTaskSuggestions] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch(`/assets/${id}`), apiFetch('/maintenance-tasks'), apiFetch(`/assets/${id}/meters`)])
      .then(([assetResult, suggestions, meterResult]) => {
        setAsset(assetResult)
        setTaskSuggestions(suggestions.map((suggestion) => suggestion.task_name))
        setMeters(meterResult)
      })
      .catch((err) => setError(err.message || 'Unable to load asset details'))
  }, [id])
  useEffect(() => {
    if (!editEventId) return
    apiFetch(`/assets/${id}/maintenance-events`).then((events) => {
      const event = events.find((candidate) => String(candidate.id) === String(editEventId))
      if (!event) return
      setTasks(event.event_type.split(',').map((task) => task.trim()).filter(Boolean))
      setForm({
        completion_meter_value: event.completion_meter_value ?? '',
        notes: event.notes ?? '',
        performed_date: event.performed_at ? event.performed_at.slice(0, 10) : localDateInputValue(),
      })
    })
  }, [id, editEventId])

  useEffect(() => {
    if (!prefillTask || editEventId) return
    setTasks((current) => {
      const incomingTasks = prefillTask.split(',').map((task) => task.trim()).filter(Boolean)
      if (incomingTasks.length === 0) return current
      const existing = new Set(current.map((task) => task.toLowerCase()))
      const additions = incomingTasks.filter((task) => !existing.has(task.toLowerCase()))
      return additions.length ? [...current, ...additions] : current
    })
  }, [prefillTask, editEventId])

  function addTask(taskValue) {
    const trimmed = taskValue.trim()
    if (!trimmed) return
    setTasks((current) => {
      if (current.some((task) => task.toLowerCase() === trimmed.toLowerCase())) return current
      return [...current, trimmed]
    })
    setTaskInput('')
  }

  function commitTaskFromInput() {
    if (!taskInput.trim()) return
    addTask(taskInput)
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
      performed_at: form.performed_date ? `${form.performed_date}T00:00:00` : null,
    }
    await apiFetch(editEventId ? `/maintenance-events/${editEventId}` : `/assets/${id}/maintenance-events`, {
      method: editEventId ? 'PUT' : 'POST',
      body: JSON.stringify({
        ...payload,
      }),
    })
    navigate(`/assets/${id}`)
  }

  const activeMeter = meters[0]

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
          onChange={(e) => {
            const nextValue = e.target.value
            setTaskInput(nextValue)
            if (taskSuggestions.some((task) => task.toLowerCase() === nextValue.trim().toLowerCase())) {
              addTask(nextValue)
            }
          }}
          onBlur={commitTaskFromInput}
          onKeyDown={(e) => {
            if (e.key === ',') {
              e.preventDefault()
              addTask(taskInput)
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              addTask(taskInput)
            }
          }}
        />
      </div>
      <datalist id="task-options">
        {taskSuggestions
          .filter((task) => !tasks.some((selectedTask) => selectedTask.toLowerCase() === task.toLowerCase()))
          .map((task) => <option key={task} value={task} />)}
      </datalist>
      <p className="hint">Type a task and press comma to add it. Click a badge to remove it.</p>
      <label htmlFor="completion-meter">{`Current ${usageLabel(asset?.service_trigger)} (Last recorded: ${activeMeter?.current_value !== null && activeMeter?.current_value !== undefined ? `${formatIntervalValue(activeMeter.current_value)} ${activeMeter.unit}` : `No reading ${usageUnit(asset?.service_trigger)}`})`}</label>
      <input id="completion-meter" inputMode="decimal" value={form.completion_meter_value} onChange={(e) => setForm({ ...form, completion_meter_value: e.target.value })} />
      <label htmlFor="performed-date">Activity Date</label>
      <input id="performed-date" type="date" value={form.performed_date} onChange={(e) => setForm({ ...form, performed_date: e.target.value })} />
      {form.performed_date && <p className="hint">{formatLongDate(`${form.performed_date}T00:00:00`)}</p>}
      <label htmlFor="maintenance-notes">Notes</label>
      <textarea id="maintenance-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

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
      setError('A service interval is required: time-based, usage-based, or both.')
      return
    }

    const usagePayload = asset?.service_trigger === 'hours'
      ? { interval_hours: usageIntervalValue, interval_distance: null, interval_cycles: null }
      : asset?.service_trigger === 'cycles'
        ? { interval_cycles: usageIntervalValue, interval_distance: null, interval_hours: null }
        : { interval_distance: usageIntervalValue, interval_hours: null, interval_cycles: null }

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
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset?.name || 'Asset', to: `/assets/${id}` }, { label: 'Add Scheduled Maintenance Task' }]} />
      <h2>Add Scheduled Maintenance Task</h2>
      {asset && <p className="hint">Configure a service interval for one maintenance task on <strong>{asset.name}</strong>.</p>}
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

      <label htmlFor="schedule-time-interval">Service Interval - Time-based maintenance (optional)</label>
      <select id="schedule-time-interval" value={form.time_interval} onChange={(e) => setForm({ ...form, time_interval: e.target.value })}>
        <option value="">No time interval</option>
        {TIME_INTERVAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>

      <label htmlFor="schedule-usage-interval">{`Service Interval - Usage-based maintenance (optional, ${usageLabel(asset?.service_trigger)} in ${usageUnit(asset?.service_trigger)})`}</label>
      <input id="schedule-usage-interval" inputMode="decimal" value={form.usage_interval} onChange={(e) => setForm({ ...form, usage_interval: e.target.value })} />
      <p className="hint">Set time, service trigger usage, or both (whichever comes first).</p>

      <div className="actions">
        <button className="btn btn-primary" type="submit">Save service interval</button>
        <Link className="btn btn-outline-secondary" to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}

export function ScheduleEditPage() {
  const { id, scheduleId } = useParams()
  const navigate = useNavigate()
  const [asset, setAsset] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', time_interval: '', usage_interval: '' })
  const [schedule, setSchedule] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([apiFetch(`/assets/${id}`), apiFetch(`/assets/${id}/schedules`)])
      .then(([assetResult, schedules]) => {
        setAsset(assetResult)
        const found = schedules.find((candidate) => String(candidate.id) === String(scheduleId))
        if (!found) throw new Error('Schedule not found')
        setSchedule(found)
        const usageInterval = assetResult.service_trigger === 'distance'
          ? found.interval_distance
          : assetResult.service_trigger === 'hours'
            ? found.interval_hours
            : found.interval_cycles
        setForm({
          title: found.title,
          description: found.description || '',
          time_interval: timeIntervalValueFromDays(found.interval_days),
          usage_interval: usageInterval ?? '',
        })
      })
      .catch((err) => setError(err.message || 'Unable to load schedule'))
  }, [id, scheduleId])

  async function submit(e) {
    e.preventDefault()
    if (!schedule) return
    const selectedTimeInterval = TIME_INTERVAL_OPTIONS.find((option) => option.value === form.time_interval)
    const intervalDays = selectedTimeInterval?.days ?? null
    const usageIntervalValue = form.usage_interval ? Number(form.usage_interval) : null
    if (intervalDays === null && usageIntervalValue === null) {
      setError('A service interval is required: time-based, usage-based, or both.')
      return
    }
    const usagePayload = asset?.service_trigger === 'hours'
      ? { interval_hours: usageIntervalValue, interval_distance: null, interval_cycles: null }
      : asset?.service_trigger === 'cycles'
        ? { interval_cycles: usageIntervalValue, interval_distance: null, interval_hours: null }
        : { interval_distance: usageIntervalValue, interval_hours: null, interval_cycles: null }
    await apiFetch(`/schedules/${schedule.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...schedule,
        ...form,
        interval_days: intervalDays,
        ...usagePayload,
      }),
    })
    navigate(`/assets/${id}`)
  }

  async function deleteTask() {
    if (!schedule) return
    const confirmed = window.confirm('Delete this scheduled maintenance task?')
    if (!confirmed) return
    await apiFetch(`/schedules/${schedule.id}`, { method: 'DELETE' })
    navigate(`/assets/${id}`)
  }

  return (
    <form onSubmit={submit} className="card narrow-card">
      <Breadcrumbs items={[{ label: 'Assets', to: '/assets' }, { label: asset?.name || 'Asset', to: `/assets/${id}` }, { label: form.title || 'Edit Scheduled Maintenance Task' }]} />
      <h2>Edit Scheduled Maintenance Task</h2>
      {error && <p className="error">{error}</p>}
      <label htmlFor="edit-schedule-title">Maintenance Task</label>
      <input id="edit-schedule-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <label htmlFor="edit-schedule-description">Description</label>
      <textarea id="edit-schedule-description" rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <label htmlFor="edit-schedule-time-interval">Service Interval - Time-based maintenance (optional)</label>
      <select id="edit-schedule-time-interval" value={form.time_interval} onChange={(e) => setForm({ ...form, time_interval: e.target.value })}>
        <option value="">No time interval</option>
        {TIME_INTERVAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <label htmlFor="edit-schedule-usage">{`Service Interval - Usage-based maintenance (optional, ${usageLabel(asset?.service_trigger)} in ${usageUnit(asset?.service_trigger)})`}</label>
      <input id="edit-schedule-usage" inputMode="decimal" value={form.usage_interval} onChange={(e) => setForm({ ...form, usage_interval: e.target.value })} />
      <p className="hint">Set time, service trigger usage, or both (whichever comes first).</p>
      <div className="actions">
        <button className="btn btn-primary" type="submit">Save service interval</button>
        <button className="btn btn-outline-danger" type="button" onClick={deleteTask}>Delete task</button>
        <Link className="btn btn-outline-secondary" to={`/assets/${id}`}>Cancel</Link>
      </div>
    </form>
  )
}
