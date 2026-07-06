import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import SettingsModal from '../components/SettingsModal'
import TaskCard from '../components/TaskCard'
import TaskDetail from '../components/TaskDetail'
import { useAuth } from '../context/useAuth'
import {
  addMemberByEmail,
  createTeamInvite,
  createLabel,
  createSection,
  deleteTask,
  getWorkspaceBundle,
  markAllNotificationsRead,
  markNotificationRead,
  saveTask,
  updateTaskStatus,
} from '../services/workspaceService'
import { canViewTask, isOverdue, PRIORITIES, roleLabel, STATUSES } from '../lib/constants'

const labelColors = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#ea580c']
const WORKSPACE_VIEWS = ['board', 'list', 'team', 'setup']

export default function WorkspacePage() {
  const { workspaceId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user, profile, signOut } = useAuth()
  const [bundle, setBundle] = useState(null)
  const [view, setView] = useState('board')
  const [selectedTask, setSelectedTask] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRole, setMemberRole] = useState('member')
  const [inviteLink, setInviteLink] = useState('')
  const [teamMessage, setTeamMessage] = useState('')
  const [sectionName, setSectionName] = useState('')
  const [labelName, setLabelName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [labelFilter, setLabelFilter] = useState('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [activeFilterGroup, setActiveFilterGroup] = useState(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [error, setError] = useState('')
  const filterMenuRef = useRef(null)

  useEffect(() => {
    const viewFromUrl = searchParams.get('view')
    if (viewFromUrl === 'settings' || viewFromUrl === 'account') {
      setSettingsOpen(true)
      return
    }
    if (WORKSPACE_VIEWS.includes(viewFromUrl) && viewFromUrl !== view) {
      setView(viewFromUrl)
    }
  }, [searchParams, view])

  const goToView = (nextView) => {
    if (!WORKSPACE_VIEWS.includes(nextView)) return
    setView(nextView)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', nextView)
    setSearchParams(nextParams)
  }

  const load = useCallback(async () => {
    setError('')
    try {
      const data = await getWorkspaceBundle(workspaceId, user.id)
      setBundle(data)
    } catch (err) {
      setError(err.message)
    }
  }, [workspaceId, user.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    window.localStorage.setItem('trackflow_default_workspace_id', workspaceId)
  }, [workspaceId])

  useEffect(() => {
    if (!filtersOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (filterMenuRef.current?.contains(event.target)) return
      setFiltersOpen(false)
      setActiveFilterGroup(null)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [filtersOpen])

  const visibleTasks = useMemo(() => {
    if (!bundle) return []
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return bundle.tasks
      .filter((task) => canViewTask(task, bundle.role, user.id))
      .filter((task) => {
        if (!normalizedSearch) return true

        const labelNames = task.labels?.map((label) => label.name).join(' ') || ''
        const sectionName =
          bundle.sections.find((section) => section.id === task.section_id)?.name || ''
        const assignee =
          bundle.members.find((member) => member.profiles?.id === task.assigned_to)
            ?.profiles?.full_name || ''

        return `${task.title} ${task.description} ${labelNames} ${sectionName} ${assignee}`
          .toLowerCase()
          .includes(normalizedSearch)
      })
      .filter((task) => statusFilter === 'all' || task.status === statusFilter)
      .filter((task) => priorityFilter === 'all' || task.priority === priorityFilter)
      .filter(
        (task) =>
          labelFilter === 'all' ||
          task.labels?.some((label) => label.id === labelFilter),
      )
  }, [bundle, labelFilter, priorityFilter, searchQuery, statusFilter, user.id])

  const overdueTasks = visibleTasks.filter(isOverdue)
  const unreadNotifications = bundle?.notifications?.filter((item) => !item.read) || []
  const isAdmin = bundle?.role === 'admin'
  const propertiesOpen = true
  const activeFilterCount = [statusFilter, priorityFilter, labelFilter]
    .filter((value) => value !== 'all').length

  const clearFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setLabelFilter('all')
  }

  const filterGroups = [
    { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Priority' },
    { value: 'labels', label: 'Labels' },
  ]

  const submitTask = async (task, labelIds, options = {}) => {
    const savedTask = await saveTask(task, labelIds)
    if (options.keepOpen) {
      setSelectedTask((current) => (current ? { ...current, ...savedTask } : savedTask))
    } else {
      setSelectedTask(null)
      setIsCreating(false)
    }
    await load()
  }

  const removeTask = async (task) => {
    await deleteTask(task.id)
    setSelectedTask(null)
    await load()
  }

  const changeStatus = async (task, status) => {
    await updateTaskStatus(task.id, status)
    await load()
  }

  const submitMember = async (event) => {
    event.preventDefault()
    if (!memberEmail.trim()) return
    setError('')
    setTeamMessage('')
    try {
      await addMemberByEmail(workspaceId, memberEmail.trim(), memberRole)
      setTeamMessage(`${memberEmail.trim()} was added to this workspace.`)
      setMemberEmail('')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const submitInvite = async (event) => {
    event.preventDefault()
    if (!memberEmail.trim()) return
    setError('')
    setTeamMessage('')
    try {
      const invite = await createTeamInvite(
        workspaceId,
        memberEmail.trim(),
        memberRole,
        user.id,
      )
      setInviteLink(`${window.location.origin}/invite/${invite.token}`)
      setTeamMessage('Invite link generated.')
    } catch (err) {
      setError(err.message)
    }
  }

  const submitSection = async (event) => {
    event.preventDefault()
    if (!sectionName.trim()) return
    await createSection(workspaceId, sectionName.trim())
    setSectionName('')
    await load()
  }

  const submitLabel = async (event) => {
    event.preventDefault()
    if (!labelName.trim()) return
    const color = labelColors[bundle.labels.length % labelColors.length]
    await createLabel(workspaceId, labelName.trim(), color)
    setLabelName('')
    await load()
  }

  const createInlineLabel = async (name) => {
    const color = labelColors[bundle.labels.length % labelColors.length]
    const label = await createLabel(workspaceId, name, color)
    await load()
    return label
  }

  const createInlineSection = async (name) => {
    const section = await createSection(workspaceId, name)
    await load()
    return section
  }

  const openNotification = async (notification) => {
    if (!notification.read) {
      await markNotificationRead(notification.id)
    }
    const task = visibleTasks.find((item) => item.id === notification.task_id)
    if (task) setSelectedTask(task)
    setNotificationsOpen(false)
    await load()
  }

  const markAllRead = async () => {
    await markAllNotificationsRead(user.id)
    await load()
  }

  if (!bundle) {
    return (
      <AppLayout>
        <div className="screen-message">{error || 'Loading workspace...'}</div>
      </AppLayout>
    )
  }

  const primaryNavigation = [
    { label: 'Projects', value: 'projects', to: '/dashboard' },
    { label: 'Settings', value: 'settings', active: settingsOpen, onClick: () => setSettingsOpen(true) },
  ]

  const workspaceNavigation = [
    { label: 'Issues', value: 'board', active: view === 'board', onClick: () => goToView('board') },
    { label: 'List view', value: 'list', active: view === 'list', onClick: () => goToView('list') },
    { label: 'Team', value: 'team', active: view === 'team', onClick: () => goToView('team') },
    { label: 'Setup', value: 'setup', active: view === 'setup', onClick: () => goToView('setup') },
  ]

  return (
    <AppLayout primaryNavigation={primaryNavigation} workspaceNavigation={workspaceNavigation}>
      <header className="linear-header">
        <div className="breadcrumb-row">
          <span className="project-icon">TF</span>
          <span>TrackFlow</span>
          <span>/</span>
          <span>Projects</span>
          <span>/</span>
          <strong>{bundle.workspace.name}</strong>
          <span className="role-chip">{roleLabel(bundle.role)}</span>
        </div>

        <div className="linear-actions">
          <button type="button" className="icon-button" aria-label="Copy project link">
            #
          </button>
          <button
            type="button"
            className="icon-button notification-button"
            aria-label="Notifications"
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            !
            {unreadNotifications.length > 0 && <span>{unreadNotifications.length}</span>}
          </button>
          <button type="button" className="primary-button" onClick={() => setIsCreating(true)}>
            New issue
          </button>

          {notificationsOpen && (
            <div className="notification-popover">
              <div className="popover-header">
                <strong>Notifications</strong>
                {unreadNotifications.length > 0 ? (
                  <button type="button" onClick={markAllRead}>
                    Mark all read
                  </button>
                ) : (
                  <small>{bundle.notifications.length} total</small>
                )}
              </div>
              {overdueTasks.length > 0 && (
                <div className="notification-item overdue-item">
                  <strong>Overdue alert</strong>
                  <p>{overdueTasks.length} task{overdueTasks.length > 1 ? 's are' : ' is'} past due.</p>
                </div>
              )}
              {bundle.notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-item ${notification.read ? '' : 'is-unread'}`}
                  onClick={() => openNotification(notification)}
                >
                  <strong>{notification.type}</strong>
                  <p>{notification.message}</p>
                </button>
              ))}
              {bundle.notifications.length === 0 && overdueTasks.length === 0 && (
                <p className="empty-popover">No notifications yet.</p>
              )}
            </div>
          )}
        </div>
      </header>

      {error && <div className="warning-box">{error}</div>}

      {overdueTasks.length > 0 && (
        <div className="warning-box">
          {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''} need attention.
        </div>
      )}

      <section className="linear-tabs">
        <div className="segmented">
          <button type="button" className={view === 'board' ? 'active' : ''} onClick={() => goToView('board')}>
            Issues
          </button>
          <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => goToView('list')}>
            List
          </button>
          <button type="button" className={view === 'team' ? 'active' : ''} onClick={() => goToView('team')}>
            Team
          </button>
          <button type="button" className={view === 'setup' ? 'active' : ''} onClick={() => goToView('setup')}>
            Setup
          </button>
        </div>
        <div className="board-tools" ref={filterMenuRef}>
          <input
            className="issue-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search issues..."
          />
          <button
            type="button"
            className={`ghost-button ${activeFilterCount ? 'has-filter' : ''}`}
            onClick={() => {
              setFiltersOpen((open) => !open)
              setActiveFilterGroup(null)
            }}
          >
            Add Filter{activeFilterCount ? ` (${activeFilterCount})` : '...'}
          </button>
          {filtersOpen && (
            <div className="filter-menu-shell">
              <div className="filter-menu">
                <div className="filter-search-row">
                  <input placeholder="Add Filter..." readOnly />
                  <kbd>F</kbd>
                </div>
                {filterGroups.map((group) => (
                  <button
                    key={group.value}
                    type="button"
                    className={`filter-row ${activeFilterGroup === group.value ? 'active' : ''}`}
                    onMouseEnter={() => setActiveFilterGroup(group.value)}
                    onClick={() => setActiveFilterGroup(group.value)}
                  >
                    <span>{group.label}</span>
                    <strong>{'>'}</strong>
                  </button>
                ))}
                <button type="button" className="filter-row muted-row" onClick={clearFilters}>
                  <span>Clear filters</span>
                </button>
              </div>

              {activeFilterGroup && (
                <div className="filter-submenu">
                  {activeFilterGroup === 'status' && (
                    <>
                      <input className="submenu-search" placeholder="Filter..." readOnly />
                      <button
                        type="button"
                        className={`submenu-row ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                      >
                        <span className="status-ring" />
                        <span>All statuses</span>
                        <small>{bundle.tasks.length} issues</small>
                      </button>
                      {STATUSES.map((status) => (
                        <button
                          key={status.value}
                          type="button"
                          className={`submenu-row ${statusFilter === status.value ? 'active' : ''}`}
                          onClick={() => setStatusFilter(status.value)}
                        >
                          <span className={`status-ring status-${status.value}`} />
                          <span>{status.label}</span>
                          <small>
                            {bundle.tasks.filter((task) => task.status === status.value).length} issues
                          </small>
                        </button>
                      ))}
                    </>
                  )}

                  {activeFilterGroup === 'priority' && (
                    <>
                      <input className="submenu-search" placeholder="Filter..." readOnly />
                      <button
                        type="button"
                        className={`submenu-row ${priorityFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setPriorityFilter('all')}
                      >
                        <span>--</span>
                        <span>All priorities</span>
                        <small>{bundle.tasks.length} issues</small>
                      </button>
                      {PRIORITIES.map((priority) => (
                        <button
                          key={priority.value}
                          type="button"
                          className={`submenu-row ${priorityFilter === priority.value ? 'active' : ''}`}
                          onClick={() => setPriorityFilter(priority.value)}
                        >
                          <span className={`priority priority-${priority.value.toLowerCase()}`}>
                            {priority.value}
                          </span>
                          <span>{priority.label.replace(`${priority.value} - `, '')}</span>
                          <small>
                            {bundle.tasks.filter((task) => task.priority === priority.value).length} issues
                          </small>
                        </button>
                      ))}
                    </>
                  )}

                  {activeFilterGroup === 'labels' && (
                    <>
                      <input className="submenu-search" placeholder="Filter..." readOnly />
                      <button
                        type="button"
                        className={`submenu-row ${labelFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setLabelFilter('all')}
                      >
                        <span>--</span>
                        <span>All labels</span>
                        <small>{bundle.tasks.length} issues</small>
                      </button>
                      {bundle.labels.map((label) => (
                        <button
                          key={label.id}
                          type="button"
                          className={`submenu-row ${labelFilter === label.id ? 'active' : ''}`}
                          onClick={() => setLabelFilter(label.id)}
                        >
                          <span className="label-dot" style={{ backgroundColor: label.color }} />
                          <span>{label.name}</span>
                          <small>
                            {
                              bundle.tasks.filter((task) =>
                                task.labels?.some((taskLabel) => taskLabel.id === label.id),
                              ).length
                            } issues
                          </small>
                        </button>
                      ))}
                    </>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {view === 'board' && (
        <section className={`linear-board-shell ${propertiesOpen ? '' : 'without-properties'}`}>
          <div className="kanban-board">
            {STATUSES.map((status) => {
              const statusTasks = visibleTasks.filter((task) => task.status === status.value)

              return (
                <div key={status.value} className="kanban-column">
                  <div className="column-title">
                    <div>
                      <span className={`status-ring status-${status.value}`} />
                      <h2>{status.label}</h2>
                      <small>{statusTasks.length}</small>
                    </div>
                    <button type="button" onClick={() => setIsCreating(true)}>+</button>
                  </div>
                  <div className="column-stack">
                    {statusTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onOpen={setSelectedTask}
                        onStatusChange={changeStatus}
                      />
                    ))}
                    {statusTasks.length === 0 && (
                      <button type="button" className="empty-issue" onClick={() => setIsCreating(true)}>
                        + Add issue
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {propertiesOpen && (
            <aside className="properties-panel">
              <section>
                <h3>Properties</h3>
                <button type="button" onClick={() => setStatusFilter('todo')}>Todo status</button>
                <button type="button" onClick={() => setStatusFilter('in_progress')}>In progress</button>
                <button type="button" onClick={() => setPriorityFilter('P1')}>P1 priority</button>
                <button type="button" onClick={() => setPriorityFilter('P2')}>P2 priority</button>
                <button
                  type="button"
                  onClick={() => {
                    setFiltersOpen(true)
                    setActiveFilterGroup(null)
                  }}
                >
                  All filters
                </button>
              </section>
            </aside>
          )}
        </section>
      )}

      {view === 'list' && (
        <section className="workspace-page-section panel">
          <div className="table-wrap">
            <table className="issue-table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Section</th>
                  <th>Assignee</th>
                  <th>Labels</th>
                  <th>Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleTasks.map((task) => {
                  const section = bundle.sections.find((item) => item.id === task.section_id)
                  const assignee = bundle.members.find((item) => item.profiles?.id === task.assigned_to)

                  return (
                    <tr key={task.id}>
                      <td>
                        <button
                          type="button"
                          className="table-title-button"
                          onClick={() => setSelectedTask(task)}
                        >
                          <strong>{task.title}</strong>
                        </button>
                      </td>
                      <td>{task.status}</td>
                      <td>
                        <span className={`priority priority-${task.priority?.toLowerCase()}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td>{section?.name || 'No section'}</td>
                      <td>{assignee?.profiles?.full_name || assignee?.profiles?.email || 'Unassigned'}</td>
                      <td>
                        <div className="table-labels">
                          {task.labels?.map((label) => (
                            <span key={label.id} className="label-pill" style={{ borderColor: label.color }}>
                              {label.name}
                            </span>
                          ))}
                          {task.labels?.length === 0 && <span className="muted-cell">No labels</span>}
                        </div>
                      </td>
                      <td>{task.due_date || 'No date'}</td>
                      <td>
                        <button type="button" className="ghost-button" onClick={() => setSelectedTask(task)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {visibleTasks.length === 0 && (
                  <tr>
                    <td colSpan="8">
                      <p className="empty-table">No issues match the current filters.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {view === 'team' && (
        <section className="workspace-page-section two-column">
          <div className="panel">
            {isAdmin ? (
              <>
                <h2>Invite team member</h2>
                <form className="stack" onSubmit={submitInvite}>
                  <label className="field">
                    <span>User email</span>
                    <input
                      type="email"
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                      placeholder="member@example.com"
                    />
                  </label>
                  <label className="field">
                    <span>Role</span>
                    <select value={memberRole} onChange={(event) => setMemberRole(event.target.value)}>
                      <option value="admin">Admin</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="member">Member</option>
                    </select>
                  </label>
                  <div className="action-row">
                    <button type="submit" className="primary-button">
                      Generate invite link
                    </button>
                    <button type="button" className="ghost-button" onClick={submitMember}>
                      Add existing user
                    </button>
                  </div>
                </form>
                {teamMessage && <p className="form-message success">{teamMessage}</p>}
                {inviteLink && (
                  <div className="invite-link-box">
                    <input value={inviteLink} readOnly />
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                    >
                      Copy
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="read-only-panel">
                <h2>Team management</h2>
                <p>
                  Only workspace Admins can invite members or change roles.
                  You can still view the team and collaborate on visible tasks.
                </p>
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Members</h2>
            <div className="member-list">
              {bundle.members.map((member) => (
                <div key={member.id} className="member-row">
                  <span>{member.profiles?.full_name || member.profiles?.email || 'Unknown user'}</span>
                  <strong>{roleLabel(member.role)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {view === 'setup' && (
        <section className="workspace-page-section two-column">
          <div className="panel">
            <h2>Sections</h2>
            {isAdmin ? (
              <form className="inline-form" onSubmit={submitSection}>
                <input
                  value={sectionName}
                  onChange={(event) => setSectionName(event.target.value)}
                  placeholder="Frontend"
                />
                <button type="submit" className="primary-button">
                  Add
                </button>
              </form>
            ) : (
              <p className="hint">Only Admins can create sections.</p>
            )}
            <div className="label-row">
              {bundle.sections.map((section) => (
                <span key={section.id} className="tag">{section.name}</span>
              ))}
            </div>
          </div>

          <div className="panel">
            <h2>Labels</h2>
            {isAdmin ? (
              <form className="inline-form" onSubmit={submitLabel}>
                <input
                  value={labelName}
                  onChange={(event) => setLabelName(event.target.value)}
                  placeholder="Bug"
                />
                <button type="submit" className="primary-button">
                  Add
                </button>
              </form>
            ) : (
              <p className="hint">Only Admins can create labels.</p>
            )}
            <div className="label-row">
              {bundle.labels.map((label) => (
                <span key={label.id} className="label-pill" style={{ borderColor: label.color }}>
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {settingsOpen && (
        <SettingsModal
          profile={profile}
          user={user}
          role={bundle.role}
          workspaceName={bundle.workspace.name}
          onClose={() => setSettingsOpen(false)}
          onSignOut={signOut}
        />
      )}

      {(selectedTask || isCreating) && (
        <TaskDetail
          task={selectedTask}
          role={bundle.role}
          userId={user.id}
          workspaceId={workspaceId}
          members={bundle.members}
          sections={bundle.sections}
          labels={bundle.labels}
          onCreateLabel={createInlineLabel}
          onCreateSection={createInlineSection}
          onClose={() => {
            setSelectedTask(null)
            setIsCreating(false)
          }}
          onSave={submitTask}
          onDelete={removeTask}
        />
      )}
    </AppLayout>
  )
}
