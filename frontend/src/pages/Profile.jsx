import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'

const DISTANCE_UNITS = ['km', 'mi']

export function ProfilePage() {
  const [form, setForm] = useState({
    display_name: '',
    preferred_distance_unit: 'km',
    current_password: '',
    new_password: '',
  })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [taskName, setTaskName] = useState('')
  const [tasks, setTasks] = useState([])
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editingTaskName, setEditingTaskName] = useState('')

  useEffect(() => {
    Promise.all([apiFetch('/auth/me'), apiFetch('/maintenance-tasks')]).then(([me, taskList]) => {
      setForm((current) => ({
        ...current,
        display_name: me.display_name,
        preferred_distance_unit: me.preferred_distance_unit || 'km',
      }))
      setTasks(taskList.filter((task) => task.id !== null))
    })
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      setForm((current) => ({ ...current, current_password: '', new_password: '' }))
      setMessage('Profile updated.')
    } catch (err) {
      setError(err.message || 'Unable to update profile')
    }
  }

  async function addTask(e) {
    e.preventDefault()
    if (!taskName.trim()) return
    const created = await apiFetch('/maintenance-tasks', {
      method: 'POST',
      body: JSON.stringify({ task_name: taskName }),
    })
    setTasks((current) => [...current, created].sort((a, b) => a.task_name.localeCompare(b.task_name)))
    setTaskName('')
  }

  async function saveTask(taskId) {
    if (!editingTaskName.trim()) return
    const updated = await apiFetch(`/maintenance-tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ task_name: editingTaskName }),
    })
    setTasks((current) => current.map((task) => (task.id === taskId ? updated : task)))
    setEditingTaskId(null)
    setEditingTaskName('')
  }

  return (
    <div className="card narrow-card">
      <form onSubmit={submit}>
        <h2>Profile</h2>
      {error && <p className="error">{error}</p>}
      {message && <p>{message}</p>}

      <label htmlFor="profile-name">Name</label>
      <input id="profile-name" required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />

      <label htmlFor="profile-unit">Preferred Distance Unit</label>
      <select id="profile-unit" value={form.preferred_distance_unit} onChange={(e) => setForm({ ...form, preferred_distance_unit: e.target.value })}>
        {DISTANCE_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
      </select>

      <label htmlFor="profile-current-password">Current Password</label>
      <input id="profile-current-password" type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} />

      <label htmlFor="profile-new-password">New Password</label>
      <input id="profile-new-password" type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} />

      <div className="actions">
        <button className="btn btn-primary" type="submit">Save profile</button>
        <Link className="btn btn-outline-secondary" to="/dashboard">Cancel</Link>
      </div>
      </form>

      <hr />
      <h3>Maintenance Task Library</h3>
      <p className="hint">Add or rename your reusable maintenance task names here.</p>
      <form onSubmit={addTask}>
        <label htmlFor="new-maintenance-task">Add maintenance task</label>
        <div className="actions">
          <input id="new-maintenance-task" value={taskName} onChange={(e) => setTaskName(e.target.value)} placeholder="e.g. Rotate Tyres" />
          <button className="btn btn-outline-primary" type="submit">Add Task</button>
        </div>
      </form>
      <div className="badges">
        {tasks.map((task) => (
          <div key={task.id} className="badge">
            {editingTaskId === task.id ? (
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
