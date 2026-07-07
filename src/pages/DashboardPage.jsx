import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import SettingsModal from '../components/SettingsModal'
import { useAuth } from '../context/useAuth'
import { createWorkspace, getMyDueTasks, getMyWorkspaces } from '../services/workspaceService'

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const formatDateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getTaskTone = (task) => {
  const todayKey = formatDateKey(new Date())

  if (task.due_date < todayKey) return 'red'
  if (task.due_date === todayKey) return 'blue'
  return 'orange'
}

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState([])
  const [dueTasks, setDueTasks] = useState([])
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

  const openTaskFromCalendar = (task) => {
    window.localStorage.setItem('trackflow_default_workspace_id', task.workspace_id)
    navigate(`/workspace/${task.workspace_id}?view=board&task=${task.id}`)
  }

  const openCalendarDate = (day) => {
    if (day.tasks.length === 0) return
    openTaskFromCalendar(day.tasks[0])
  }

  const handleCalendarDateKeyDown = (event, day) => {
    if (day.tasks.length === 0) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openCalendarDate(day)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [rows, taskRows] = await Promise.all([
        getMyWorkspaces(user.id),
        getMyDueTasks(user.id),
      ])
      setWorkspaces(rows)
      setDueTasks(taskRows)
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

  const dashboardCalendar = useMemo(() => {
    const today = new Date()
    const calendarYear = today.getFullYear()
    const calendarMonth = today.getMonth()
    const firstDay = new Date(calendarYear, calendarMonth, 1)
    const startDate = new Date(calendarYear, calendarMonth, 1 - firstDay.getDay())
    const todayKey = formatDateKey(today)
    const tasksByDate = new Map()

    dueTasks.forEach((task) => {
      const list = tasksByDate.get(task.due_date) || []
      list.push(task)
      tasksByDate.set(task.due_date, list)
    })

    const cells = Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(startDate)
      cellDate.setDate(startDate.getDate() + index)
      const key = formatDateKey(cellDate)

      return {
        key,
        date: cellDate.getDate(),
        outside: cellDate.getMonth() !== calendarMonth,
        today: key === todayKey,
        tasks: tasksByDate.get(key) || [],
      }
    })

    return {
      title: today.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      cells,
    }
  }, [dueTasks])

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
                <p className="hint">Tasks grouped by due date</p>
              </div>
              <strong>{dashboardCalendar.title}</strong>
            </div>
            <div className="dashboard-calendar-grid">
              {weekDays.map((day) => (
                <strong key={day} className="calendar-weekday">{day}</strong>
              ))}
              {dashboardCalendar.cells.map((day) => (
                <div
                  key={day.key}
                  className={`calendar-date-cell ${day.outside ? 'is-outside' : ''} ${day.today ? 'is-today' : ''} ${day.tasks.length > 0 ? 'has-tasks' : ''}`}
                  role={day.tasks.length > 0 ? 'button' : undefined}
                  tabIndex={day.tasks.length > 0 ? 0 : undefined}
                  onClick={() => openCalendarDate(day)}
                  onKeyDown={(event) => handleCalendarDateKeyDown(event, day)}
                >
                  <span>{day.date}</span>
                  {day.tasks.slice(0, 2).map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      className={`calendar-event event-${getTaskTone(task)}`}
                      title={`${task.workspace_name}: ${task.title}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        openTaskFromCalendar(task)
                      }}
                    >
                      {task.title}
                    </button>
                  ))}
                  {day.tasks.length > 2 && (
                    <small className="calendar-more">+{day.tasks.length - 2} more</small>
                  )}
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
