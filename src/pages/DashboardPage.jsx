import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import SettingsModal from '../components/SettingsModal'
import { useAuth } from '../context/useAuth'
import { createWorkspace, getMyWorkspaces } from '../services/workspaceService'

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const calendarCells = [
  { date: 28, outside: true },
  { date: 29, outside: true },
  { date: 30, outside: true },
  { date: 1 },
  { date: 2 },
  { date: 3, event: 'Planning', tone: 'blue' },
  { date: 4 },
  { date: 5 },
  { date: 6, event: 'Auth fix', tone: 'red' },
  { date: 7, today: true, event: 'Team invite', tone: 'green' },
  { date: 8, event: 'Due task', tone: 'orange' },
  { date: 9 },
  { date: 10, event: 'Review', tone: 'purple' },
  { date: 11 },
  { date: 12 },
  { date: 13 },
  { date: 14, event: 'Frontend', tone: 'blue' },
  { date: 15 },
  { date: 16, event: 'Backend', tone: 'green' },
  { date: 17 },
  { date: 18 },
  { date: 19 },
  { date: 20 },
  { date: 21, event: 'List view', tone: 'purple' },
  { date: 22 },
  { date: 23 },
  { date: 24, event: 'Deploy', tone: 'orange' },
  { date: 25 },
  { date: 26 },
  { date: 27 },
  { date: 28 },
  { date: 29, event: 'Demo', tone: 'green' },
  { date: 30 },
  { date: 31 },
  { date: 1, outside: true },
]

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')
  const openWorkspace = (workspaceId) => {
    window.localStorage.setItem('trackflow_default_workspace_id', workspaceId)
    navigate(`/workspace/${workspaceId}`)
  }

  const getDefaultWorkspace = () => {
    const defaultWorkspaceId = window.localStorage.getItem('trackflow_default_workspace_id')
    return workspaces.find((workspace) => workspace.id === defaultWorkspaceId) || workspaces[0]
  }

  const openDefaultWorkspaceView = (view) => {
    const workspace = getDefaultWorkspace()
    if (!workspace) return
    window.localStorage.setItem('trackflow_default_workspace_id', workspace.id)
    navigate(`/workspace/${workspace.id}?view=${view}`)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await getMyWorkspaces(user.id)
      setWorkspaces(rows)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    load()
  }, [load])

  const submit = async (event) => {
    event.preventDefault()
    if (!name.trim()) return
    try {
      const workspaceId = await createWorkspace(name.trim())
      window.localStorage.setItem('trackflow_default_workspace_id', workspaceId)
      setName('')
      navigate(`/workspace/${workspaceId}`)
    } catch (err) {
      setError(err.message)
    }
  }

  const primaryNavigation = [
    { label: 'Projects', value: 'projects', to: '/dashboard' },
    { label: 'Settings', value: 'settings', active: settingsOpen, onClick: () => setSettingsOpen(true) },
  ]

  const workspaceNavigation =
    workspaces.length > 0
      ? [
          { label: 'Issues', value: 'board', onClick: () => openDefaultWorkspaceView('board') },
          { label: 'List view', value: 'list', onClick: () => openDefaultWorkspaceView('list') },
          { label: 'Team', value: 'team', onClick: () => openDefaultWorkspaceView('team') },
          { label: 'Setup', value: 'setup', onClick: () => openDefaultWorkspaceView('setup') },
        ]
      : null

  return (
    <AppLayout primaryNavigation={primaryNavigation} workspaceNavigation={workspaceNavigation}>
      <header className="dashboard-header page-header">
        <div>
          <p className="eyebrow">Issue tracker</p>
          <h1>Welcome, {profile?.full_name || 'there'}</h1>
          <p className="lead">Create a workspace, invite members, and start tracking issues.</p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="metric">
          <strong>{workspaces.length}</strong>
          <span>Workspaces</span>
        </div>
        <div className="metric">
          <strong>3</strong>
          <span>Roles supported</span>
        </div>
        <div className="metric">
          <strong>2</strong>
          <span>Task views</span>
        </div>
      </section>

      <section id="workspaces" className="two-column">
        <div className="dashboard-side-stack">
          <div className="panel create-workspace-card">
            <h2>Create workspace</h2>
            <form className="inline-form" onSubmit={submit}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="E-commerce Website"
              />
              <button type="submit" className="primary-button">
                Create
              </button>
            </form>
            {error && <p className="form-message error">{error}</p>}
          </div>

          <div className="panel dashboard-calendar-card">
            <div className="panel-heading">
              <div>
                <h2>Calendar</h2>
                <p className="hint">Upcoming issue activity</p>
              </div>
              <strong>Jul 2026</strong>
            </div>
            <div className="dashboard-calendar-grid">
              {weekDays.map((day) => (
                <strong key={day} className="calendar-weekday">{day}</strong>
              ))}
              {calendarCells.map((day, index) => (
                <div
                  key={`${day.date}-${index}`}
                  className={`calendar-date-cell ${day.outside ? 'is-outside' : ''} ${day.today ? 'is-today' : ''}`}
                >
                  <span>{day.date}</span>
                  {day.event && <small className={`calendar-event event-${day.tone}`}>{day.event}</small>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel workspace-panel">
          <div className="panel-heading">
            <div>
              <h2>Your workspaces</h2>
              <p className="hint">Open a project workspace to manage issues, team, and settings.</p>
            </div>
          </div>
          {loading ? (
            <p className="hint">Loading workspaces...</p>
          ) : (
            <div className={`workspace-list ${workspaces.length > 5 ? 'is-scrollable' : ''}`}>
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  type="button"
                  className="workspace-card-link"
                  onClick={() => openWorkspace(workspace.id)}
                >
                  <span className="workspace-card-copy">
                    <strong>{workspace.name}</strong>
                    <small>Issue workspace</small>
                  </span>
                  <span className="workspace-card-actions">
                    <small className={`role-badge role-${workspace.role}`}>
                      {workspace.role.replace('_', ' ')}
                    </small>
                    <em>Open workspace</em>
                  </span>
                </button>
              ))}
              {workspaces.length === 0 && (
                <p className="hint">Create your first workspace to begin.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {settingsOpen && (
        <SettingsModal
          profile={profile}
          user={user}
          onClose={() => setSettingsOpen(false)}
          onSignOut={signOut}
        />
      )}
    </AppLayout>
  )
}
