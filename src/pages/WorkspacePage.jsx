import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, ChevronDown } from 'lucide-react'
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
import { canViewTask, isOverdue, PRIORITIES, roleLabel, statusLabel, STATUSES } from '../lib/constants'

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
  const [expandedListSections, setExpandedListSections] = useState({})
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [activeFilterGroup, setActiveFilterGroup] = useState(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draggedTaskId, setDraggedTaskId] = useState(null)
  const [dragOverStatus, setDragOverStatus] = useState(null)
  const [boardPropertiesOpen, setBoardPropertiesOpen] = useState(false)
  const [dueModalOpen, setDueModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')
  const filterMenuRef = useRef(null)
  const displayMenuRef = useRef(null)
  const notificationMenuRef = useRef(null)

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
    setSelectedTask(null)
    setIsCreating(false)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', nextView)
    nextParams.delete('task')
    setSearchParams(nextParams)
  }

  const load = useCallback(async () => {
    setError('')
    try {
      // This bundle is the single source of truth for the workspace screen.
      // Board, list, team, setup, notifications, and task details all read from it.
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
    if (!bundle) return

    // Shared issue links use ?task=<id>; when that param exists, open the
    // matching task detail after the workspace data finishes loading.
    const taskIdFromUrl = searchParams.get('task')
    if (!taskIdFromUrl) {
      setSelectedTask(null)
      return
    }

    const taskFromUrl = bundle.tasks.find((task) => task.id === taskIdFromUrl)
    if (taskFromUrl) {
      setIsCreating(false)
      setSelectedTask(taskFromUrl)
    }
  }, [bundle, searchParams])

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

  useEffect(() => {
    if (!boardPropertiesOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (displayMenuRef.current?.contains(event.target)) return
      setBoardPropertiesOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [boardPropertiesOpen])

  useEffect(() => {
    if (!notificationsOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (notificationMenuRef.current?.contains(event.target)) return
      setNotificationsOpen(false)
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [notificationsOpen])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = ({ title, message, type = 'success' }) => {
    setToast({ title, message, type })
  }

  const clearTaskRoute = () => {
    if (!searchParams.has('task')) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('task')
    setSearchParams(nextParams, { replace: true })
  }

  const closeTaskDetail = () => {
    setSelectedTask(null)
    setIsCreating(false)
    clearTaskRoute()
  }

  const openTaskDetail = (task, options = {}) => {
    setIsCreating(false)
    setSelectedTask(task)

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', view)
    nextParams.set('task', task.id)
    setSearchParams(nextParams, options)
  }

  const visibleTasks = useMemo(() => {
    if (!bundle) return []
    const normalizedSearch = searchQuery.trim().toLowerCase()

    // Apply RBAC first, then search and filter controls. Every view uses this
    // same list, so board and list always show the same authorized tasks.
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

  const listSectionGroups = useMemo(() => {
    if (!bundle) return []

    // Convert sections into table groups. Each group owns only the tasks whose
    // section_id matches that section.
    const sectionGroups = bundle.sections.map((section) => ({
      id: section.id,
      name: section.name,
      tasks: visibleTasks.filter((task) => task.section_id === section.id),
    }))

    // Tasks without a section still need a visible list bucket.
    const noSectionTasks = visibleTasks.filter((task) => !task.section_id)
    if (noSectionTasks.length > 0 || sectionGroups.length === 0) {
      sectionGroups.push({
        id: 'no-section',
        name: 'No section',
        tasks: noSectionTasks,
      })
    }

    return sectionGroups
  }, [bundle, visibleTasks])

  const overdueTasks = useMemo(() => visibleTasks.filter(isOverdue), [visibleTasks])
  const overdueTaskIds = useMemo(
    () => overdueTasks.map((task) => task.id).sort(),
    [overdueTasks],
  )
  const unreadNotifications = bundle?.notifications?.filter((item) => !item.read) || []
  const notificationTitle = (type) => {
    if (type === 'mention') return 'Mention'
    if (type === 'comment') return 'Comment'
    return type
  }
  const isAdmin = bundle?.role === 'admin'
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

  const toggleListSection = (sectionId, defaultOpen = false) => {
    setExpandedListSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? defaultOpen),
    }))
  }

  const openCreateTask = () => {
    if (!isAdmin) {
      showToast({
        type: 'error',
        title: 'Admin permission required',
        message: 'Only Admins can create tasks in this workspace.',
      })
      return
    }

    setIsCreating(true)
  }

  const submitTask = async (task, labelIds, options = {}) => {
    const isNewTask = !task.id
    if (isNewTask && !isAdmin) {
      showToast({
        type: 'error',
        title: 'Admin permission required',
        message: 'Only Admins can create tasks in this workspace.',
      })
      setIsCreating(false)
      return
    }

    try {
      const savedTask = await saveTask(task, labelIds)
      if (options.keepOpen) {
        setSelectedTask((current) => (current ? { ...current, ...savedTask } : savedTask))
      } else {
        setSelectedTask(null)
        setIsCreating(false)
        clearTaskRoute()
      }
      showToast({
        title: isNewTask ? 'Issue created' : 'Issue updated',
        message: isNewTask
          ? 'The task is now available on the board.'
          : 'Your changes were saved successfully.',
      })
      await load()
    } catch (err) {
      console.error(err)
      showToast({
        type: 'error',
        title: 'Could not save issue',
        message: 'Please check the task details and try again.',
      })
      throw err
    }
  }

  const removeTask = async (task) => {
    try {
      await deleteTask(task.id)
      setSelectedTask(null)
      clearTaskRoute()
      showToast({
        title: 'Issue deleted',
        message: 'The task was removed from this workspace.',
      })
      await load()
    } catch (err) {
      console.error(err)
      showToast({
        type: 'error',
        title: 'Could not delete issue',
        message: 'You may not have permission to delete this task.',
      })
    }
  }

  const changeStatus = async (task, status) => {
    try {
      await updateTaskStatus(task.id, status)
      showToast({
        title: 'Status updated',
        message: 'The task moved to the selected column.',
      })
      await load()
    } catch (err) {
      console.error(err)
      showToast({
        type: 'error',
        title: 'Could not update status',
        message: 'Please try moving the task again.',
      })
    }
  }

  const startDraggingTask = (event, task) => {
    setDraggedTaskId(task.id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', task.id)
  }

  const dropTaskIntoStatus = async (event, status) => {
    event.preventDefault()
    const taskId = event.dataTransfer.getData('text/plain') || draggedTaskId
    const task = visibleTasks.find((item) => item.id === taskId)

    setDragOverStatus(null)
    setDraggedTaskId(null)

    if (!task || task.status === status) return
    await changeStatus(task, status)
  }

  const stopDraggingTask = () => {
    setDraggedTaskId(null)
    setDragOverStatus(null)
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
    if (task) openTaskDetail(task)
    setNotificationsOpen(false)
    await load()
  }

  const markAllRead = async () => {
    await markAllNotificationsRead(user.id)
    await load()
  }

  const dueSeenStorageKey = `trackflow_seen_due_tasks_session_${user.id}_${workspaceId}`

  const rememberSeenDueTasks = () => {
    window.sessionStorage.setItem(dueSeenStorageKey, JSON.stringify(overdueTaskIds))
  }

  const closeDueModal = () => {
    rememberSeenDueTasks()
    setDueModalOpen(false)
  }

  const openDueTask = (task) => {
    rememberSeenDueTasks()
    setDueModalOpen(false)
    openTaskDetail(task)
  }

  useEffect(() => {
    if (overdueTaskIds.length === 0) return

    const seenTaskIds = JSON.parse(window.sessionStorage.getItem(dueSeenStorageKey) || '[]')
    const hasNewOverdueTask = overdueTaskIds.some((taskId) => !seenTaskIds.includes(taskId))

    if (hasNewOverdueTask) {
      setDueModalOpen(true)
    }
  }, [dueSeenStorageKey, overdueTaskIds])

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
          <div className="notification-menu-anchor" ref={notificationMenuRef}>
            <button
              type="button"
              className={`icon-button notification-button ${unreadNotifications.length > 0 ? 'has-unread' : ''}`}
              aria-label="Notifications"
              onClick={() => setNotificationsOpen((open) => !open)}
            >
              <Bell size={17} aria-hidden="true" />
              {unreadNotifications.length > 0 && (
                <span>{unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}</span>
              )}
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
                    <small>No new</small>
                  )}
                </div>
                {overdueTasks.length > 0 && (
                  <div className="notification-item overdue-item">
                    <strong>Overdue alert</strong>
                    <p>{overdueTasks.length} task{overdueTasks.length > 1 ? 's are' : ' is'} past due.</p>
                  </div>
                )}
                {unreadNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`notification-item ${notification.read ? '' : 'is-unread'}`}
                    onClick={() => openNotification(notification)}
                  >
                    <strong>{notificationTitle(notification.type)}</strong>
                    <p>{notification.message}</p>
                  </button>
                ))}
                {unreadNotifications.length === 0 && overdueTasks.length === 0 && (
                  <p className="empty-popover">No new notifications.</p>
                )}
              </div>
            )}
          </div>
          <button type="button" className="primary-button" onClick={openCreateTask}>
            New issue
          </button>
        </div>
      </header>

      {error && <div className="warning-box">{error}</div>}

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
          {view === 'board' && (
            <div className="display-menu-anchor" ref={displayMenuRef}>
              <button
                type="button"
                className={`ghost-button ${boardPropertiesOpen ? 'is-active' : ''}`}
                onClick={() => setBoardPropertiesOpen((open) => !open)}
              >
                Display
              </button>
              {boardPropertiesOpen && (
                <div className="display-properties-panel">
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
                        setBoardPropertiesOpen(false)
                      }}
                    >
                      All filters
                    </button>
                  </section>
                </div>
              )}
            </div>
          )}
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
        <section className="linear-board-shell">
          <div className="kanban-board">
            {STATUSES.map((status) => {
              const statusTasks = visibleTasks.filter((task) => task.status === status.value)

              return (
                <div
                  key={status.value}
                  className={`kanban-column status-column-${status.value} ${dragOverStatus === status.value ? 'is-drop-target' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                    setDragOverStatus(status.value)
                  }}
                  onDragLeave={(event) => {
                    if (event.currentTarget.contains(event.relatedTarget)) return
                    setDragOverStatus(null)
                  }}
                  onDrop={(event) => dropTaskIntoStatus(event, status.value)}
                >
                  <div className="column-title">
                    <div>
                      <span className={`status-ring status-${status.value}`} />
                      <h2>{status.label}</h2>
                      <small>{statusTasks.length}</small>
                    </div>
                    <button type="button" onClick={openCreateTask}>+</button>
                  </div>
                  <div className="column-stack">
                    {statusTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onOpen={openTaskDetail}
                        onDragStart={startDraggingTask}
                        onDragEnd={stopDraggingTask}
                        isDragging={draggedTaskId === task.id}
                      />
                    ))}
                    {statusTasks.length === 0 && (
                      <button type="button" className="empty-issue" onClick={openCreateTask}>
                        + Add issue
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {view === 'list' && (
        <section className="workspace-page-section list-section-groups">
          {listSectionGroups.map((group, index) => {
            const defaultOpen = index === 0
            const isExpanded = expandedListSections[group.id] ?? defaultOpen

            return (
              <article key={group.id} className={`panel section-table-panel ${isExpanded ? 'is-expanded' : ''}`}>
                <button
                  type="button"
                  className="section-table-header"
                  aria-expanded={isExpanded}
                  onClick={() => toggleListSection(group.id, defaultOpen)}
                >
                  <div>
                    <h2>{group.name}</h2>
                    <span>{group.tasks.length} issue{group.tasks.length === 1 ? '' : 's'}</span>
                  </div>
                  <span className="section-toggle-button">
                    <span>{isExpanded ? 'Hide' : 'Show'}</span>
                    <ChevronDown size={18} aria-hidden="true" />
                  </span>
                </button>
                {isExpanded && (
                  <div className="table-wrap section-table-scroll">
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
                        {/* group is one section bucket from listSectionGroups;
                            group.tasks are the rows for that section. */}
                        {group.tasks.map((task) => {
                          const section = bundle.sections.find((item) => item.id === task.section_id)
                          const assignee = bundle.members.find((item) => item.profiles?.id === task.assigned_to)

                          return (
                            <tr key={task.id}>
                              <td>
                                <button
                                  type="button"
                                  className="table-title-button"
                                  onClick={() => openTaskDetail(task)}
                                >
                                  <strong>{task.title}</strong>
                                </button>
                              </td>
                              <td>
                                <span className={`status-pill status-pill-${task.status}`}>
                                  {statusLabel(task.status)}
                                </span>
                              </td>
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
                                <button type="button" className="ghost-button" onClick={() => openTaskDetail(task)}>
                                  Open
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                        {group.tasks.length === 0 && (
                          <tr>
                            <td colSpan="8">
                              <p className="empty-table">No issues in this section.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            )
          })}
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
                    <div>
                      <strong>Invite link ready</strong>
                      <small>The private token is hidden. Copy it only when you need to test manually.</small>
                    </div>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => navigator.clipboard.writeText(inviteLink)}
                    >
                      Copy invite link
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

      {dueModalOpen && (
        <div className="due-modal-backdrop">
          <section className="due-task-modal" aria-label="Due tasks">
            <div className="drawer-header">
              <div>
                <p className="eyebrow">Due date alert</p>
                <h2>Tasks need attention</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={closeDueModal}
                aria-label="Close due tasks"
              >
                X
              </button>
            </div>
            <div className="due-task-list">
              {overdueTasks.map((task) => {
                const assignee = bundle.members.find((item) => item.profiles?.id === task.assigned_to)
                const section = bundle.sections.find((item) => item.id === task.section_id)

                return (
                  <button
                    key={task.id}
                    type="button"
                    className="due-task-row"
                    onClick={() => openDueTask(task)}
                  >
                    <span>
                      <strong>{task.title}</strong>
                      <small>{section?.name || 'No section'} · {statusLabel(task.status)}</small>
                    </span>
                    <span>
                      <em>Due {task.due_date}</em>
                      <small>{assignee?.profiles?.full_name || assignee?.profiles?.email || 'Unassigned'}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {(selectedTask || isCreating) && (
        <TaskDetail
          task={selectedTask}
          role={bundle.role}
          userId={user.id}
          workspaceId={workspaceId}
          workspaceName={bundle.workspace.name}
          members={bundle.members}
          sections={bundle.sections}
          labels={bundle.labels}
          onCreateLabel={createInlineLabel}
          onCreateSection={createInlineSection}
          onClose={closeTaskDetail}
          onSave={submitTask}
          onDelete={removeTask}
        />
      )}

      {toast && (
        <div className={`toast-message toast-${toast.type}`} role="status" aria-live="polite">
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Close notification">
            X
          </button>
        </div>
      )}
    </AppLayout>
  )
}
