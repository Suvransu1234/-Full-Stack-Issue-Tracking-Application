import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import SettingsModal from '../components/SettingsModal'
import { useAuth } from '../context/useAuth'
import { createWorkspace, getMyWorkspaces } from '../services/workspaceService'

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
        <div className="panel">
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
            <div className="workspace-list">
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
