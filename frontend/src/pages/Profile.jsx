import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

const DISTANCE_UNITS = ['km', 'mi']

export function ProfilePage({ onLogout }) {
  const [form, setForm] = useState({
    preferred_distance_unit: 'km',
    current_password: '',
    new_password: '',
  })
  const [upcomingTaskWindowWeeks, setUpcomingTaskWindowWeeks] = useState('2')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [taskName, setTaskName] = useState('')
  const [tasks, setTasks] = useState([])
  const [assetTypes, setAssetTypes] = useState([])
  const [selectedAssetType, setSelectedAssetType] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingTaskName, setEditingTaskName] = useState('')
  const [importFile, setImportFile] = useState(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    Promise.all([apiFetch('/auth/me'), apiFetch('/asset-types')]).then(([me, assetTypeList]) => {
      setForm((current) => ({ ...current, preferred_distance_unit: me.preferred_distance_unit || 'km' }))
      setUpcomingTaskWindowWeeks(String(Math.max(1, Math.round((me.upcoming_task_window_days || 14) / 7))))
      setAssetTypes(assetTypeList)
      if (assetTypeList[0]?.name) setSelectedAssetType(assetTypeList[0].name)
    })
  }, [])

  useEffect(() => {
    if (!selectedAssetType) {
      setTasks([])
      return
    }
    apiFetch(`/maintenance-tasks?asset_type=${encodeURIComponent(selectedAssetType)}`).then(setTasks)
  }, [selectedAssetType])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const upcomingWeeks = Math.max(1, Number(upcomingTaskWindowWeeks || 1))
      await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          upcoming_task_window_days: Math.round(upcomingWeeks * 7),
        }),
      })
      setForm((current) => ({ ...current, current_password: '', new_password: '' }))
      setMessage('Profile updated.')
    } catch (err) {
      setError(err.message || 'Unable to update profile')
    }
  }

  async function addTask(e) {
    e.preventDefault()
    if (!taskName.trim() || !selectedAssetType) return
    const created = await apiFetch('/maintenance-tasks', {
      method: 'POST',
      body: JSON.stringify({ task_name: taskName, asset_type: selectedAssetType }),
    })
    setTasks((current) => [...current, created].sort((a, b) => a.task_name.localeCompare(b.task_name)))
    setTaskName('')
  }

  async function saveTask(taskId) {
    if (!editingTaskName.trim() || !selectedAssetType) return
    const updated = await apiFetch(`/maintenance-tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ task_name: editingTaskName, asset_type: selectedAssetType }),
    })
    setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)))
    setEditingTaskId(null)
    setEditingTaskName('')
  }

  async function deleteTask(taskId) {
    const impact = await apiFetch(`/maintenance-tasks/${taskId}/impact`)
    const warningLines = []
    if (impact.affected_schedules) warningLines.push(`${impact.affected_schedules} scheduled maintenance task(s) will be removed.`)
    if (impact.affected_history_records) warningLines.push(`${impact.affected_history_records} maintenance history record(s) will be updated.`)
    if (impact.deleted_history_records) warningLines.push(`${impact.deleted_history_records} maintenance history record(s) will be deleted because they would have no remaining tasks.`)
    const warningText = warningLines.length ? `\n\nImpact:\n- ${warningLines.join('\n- ')}` : '\n\nNo maintenance history or schedules are impacted.'
    const confirmed = window.confirm(`Delete "${impact.task_name}" for asset type "${impact.asset_type || 'Unscoped'}"?${warningText}`)
    if (!confirmed) return
    await apiFetch(`/maintenance-tasks/${taskId}`, { method: 'DELETE' })
    setTasks((current) => current.filter((task) => task.id !== taskId))
  }

  async function exportWorkbook() {
    setError('')
    setMessage('')
    setIsExporting(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/auth/profile/export', {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) {
        throw new Error(await response.text() || 'Unable to export workbook')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const contentDisposition = response.headers.get('content-disposition') || ''
      const fileNameMatch = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition)
      a.href = url
      a.download = fileNameMatch?.[1] || 'maintenance-profile-export.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setMessage('Workbook exported.')
    } catch (err) {
      setError(err.message || 'Unable to export workbook')
    } finally {
      setIsExporting(false)
    }
  }

  async function importWorkbook(e) {
    e.preventDefault()
    if (!importFile) return
    setError('')
    setMessage('')
    setIsImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      const result = await apiFetch('/auth/profile/import', { method: 'POST', body: formData })
      setMessage(`Workbook imported. Assets: ${result.imported_assets}, activities: ${result.imported_events}, schedules: ${result.imported_schedules}.`)
      const [assetTypeList] = await Promise.all([apiFetch('/asset-types')])
      setAssetTypes(assetTypeList)
    } catch (err) {
      setError(err.message || 'Unable to import workbook')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="card narrow-card">
      <form onSubmit={submit} autoComplete="off">
        <h2>Profile</h2>
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}

      <label htmlFor="profile-unit">Preferred Distance Unit</label>
      <select id="profile-unit" autoComplete="off" value={form.preferred_distance_unit} onChange={(e) => setForm({ ...form, preferred_distance_unit: e.target.value })}>
        {DISTANCE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
      </select>

      <label htmlFor="profile-upcoming-window">Upcoming Task Window (weeks)</label>
      <input
        id="profile-upcoming-window"
        type="number"
        min="1"
        step="1"
        autoComplete="off"
        value={upcomingTaskWindowWeeks}
        onChange={(e) => setUpcomingTaskWindowWeeks(e.target.value)}
      />

      <label htmlFor="profile-current-password">Current Password</label>
      <input id="profile-current-password" autoComplete="current-password" type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />

      <label htmlFor="profile-new-password">New Password</label>
      <input id="profile-new-password" autoComplete="new-password" type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />

      <div className="actions">
        <button className="btn btn-primary" type="submit">Save profile</button>
        <button className="btn btn-danger" type="button" onClick={onLogout}>Logout</button>
        <Link className="btn btn-outline-secondary" to="/dashboard">Cancel</Link>
      </div>
      </form>

      <hr />
      <h3>Data Portability</h3>
      <p className="hint">Export your profile data to XLSX, or import an exported workbook into this profile.</p>
      <div className="actions">
        <button className="btn btn-outline-primary" type="button" onClick={exportWorkbook} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export XLSX'}
        </button>
      </div>
      <form onSubmit={importWorkbook} autoComplete="off">
        <label htmlFor="profile-import">Import XLSX</label>
        <div className="actions">
          <input
            id="profile-import"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
          />
          <button className="btn btn-outline-primary" type="submit" disabled={!importFile || isImporting}>
            {isImporting ? 'Importing...' : 'Import Workbook'}
          </button>
        </div>
      </form>

      <hr />
      <h3>Maintenance Task Library</h3>
      <p className="hint">Select an asset type to manage reusable maintenance task names for that type.</p>
      <label htmlFor="task-library-asset-type">Asset Type</label>
      <select id="task-library-asset-type" value={selectedAssetType} onChange={(e) => setSelectedAssetType(e.target.value)}>
        {assetTypes.map((assetType) => <option key={assetType.id} value={assetType.name}>{assetType.name}</option>)}
      </select>
      <form onSubmit={addTask} autoComplete="off">
        <label htmlFor="new-maintenance-task">Add maintenance task</label>
        <div className="actions">
          <input id="new-maintenance-task" autoComplete="off" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="e.g. Rotate Tyres" />
          <button className="btn btn-outline-primary" type="submit" disabled={!selectedAssetType}>Add Task</button>
        </div>
      </form>
      <div className="badges">
        {tasks.length === 0 && <p className="muted-text">No maintenance tasks saved for this asset type yet.</p>}
        {tasks.map((task) => (
          <div key={`${task.id ?? 'suggestion'}-${task.task_name}`} className="badge">
            {editingTaskId === task.id && task.id !== null ? (
              <>
                <input value={editingTaskName} onChange={(e) => setEditingTaskName(e.target.value)} />
                <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => saveTask(task.id)}>Save</button>
              </>
            ) : (
              <>
                <span>{task.task_name}</span>
                <button
                  className="btn btn-sm btn-link"
                  type="button"
                  onClick={() => { setEditingTaskId(task.id); setEditingTaskName(task.task_name) }}
                >
                  Edit
                </button>
                <button className="btn btn-sm btn-link text-danger" type="button" onClick={() => deleteTask(task.id)}>
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
