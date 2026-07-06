export const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'member', label: 'Member' },
]

export const STATUSES = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'Todo' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
]

export const PRIORITIES = [
  { value: 'P1', label: 'P1 - Critical' },
  { value: 'P2', label: 'P2 - High' },
  { value: 'P3', label: 'P3 - Normal' },
]

export const roleLabel = (role) =>
  ROLES.find((item) => item.value === role)?.label || 'Member'

export const statusLabel = (status) =>
  STATUSES.find((item) => item.value === status)?.label || status

export const priorityLabel = (priority) =>
  PRIORITIES.find((item) => item.value === priority)?.label || priority

export const canViewTask = (task, role, userId) => {
  if (!task) return false
  if (role === 'admin') return true
  if (task.assigned_to === userId) return true
  if (!task.visibility_role) return true
  return task.visibility_role === role
}

export const canEditTaskMain = (task, role) => {
  if (role === 'admin') return true
  if (role === 'project_manager') return task?.created_by_role !== 'admin'
  return false
}

export const canDeleteTask = (task, role) => {
  if (role === 'admin') return true
  return false
}

export const isOverdue = (task) => {
  if (!task?.due_date || task.status === 'done') return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(`${task.due_date}T00:00:00`) < today
}
