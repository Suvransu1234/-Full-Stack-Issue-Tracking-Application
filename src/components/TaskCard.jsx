import { isOverdue } from '../lib/constants'

export default function TaskCard({ task, onOpen }) {
  const issueKey = `TF-${task.id?.slice(0, 3).toUpperCase() || 'NEW'}`
  const initials = (task.assigned_to || task.title || 'TF').slice(0, 2).toUpperCase()
  const createdDate = task.created_at
    ? new Date(task.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
    : 'Today'

  return (
    <article
      className={`task-card ${isOverdue(task) ? 'is-overdue' : ''}`}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(task)
        }
      }}
    >
      <div className="issue-card-topline">
        <span>{issueKey}</span>
        <span className="avatar-dot">{initials}</span>
      </div>
      <button
        type="button"
        className="task-title-button"
        onClick={(event) => {
          event.stopPropagation()
          onOpen(task)
        }}
      >
        <strong>{task.title}</strong>
      </button>
      <div className="task-meta issue-card-pills">
        <span className={`priority priority-${task.priority?.toLowerCase()}`}>
          {task.priority}
        </span>
        {task.labels?.map((label) => (
          <span key={label.id} className="label-pill" style={{ borderColor: label.color }}>
            {label.name}
          </span>
        ))}
        {task.labels?.length === 0 && <span className="label-pill">No label</span>}
      </div>
      <div className="issue-card-footer">
        <span>Created {createdDate}</span>
        {task.due_date && (
          <span className={isOverdue(task) ? 'due-chip overdue' : 'due-chip'}>Due {task.due_date}</span>
        )}
      </div>
    </article>
  )
}
