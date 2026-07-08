import { useEffect, useMemo, useRef, useState } from 'react'
import { addComment, enableTaskSharing, getComments } from '../services/workspaceService'
import {
  canDeleteTask,
  canEditTaskMain,
  priorityLabel,
  roleLabel,
  STATUSES,
  statusLabel,
} from '../lib/constants'
import TaskForm from './TaskForm'

const normalizeMention = (value = '') =>
  value.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._-]/g, '')

const getMentionedUserIds = (content, members) => {
  const tokens = content.match(/@[a-z0-9._@-]+/gi) || []
  const normalizedTokens = tokens.map(normalizeMention)

  return members
    .filter((member) => {
      const profile = member.profiles
      const email = profile?.email?.toLowerCase()
      const emailName = email?.split('@')[0]
      const fullName = normalizeMention(profile?.full_name?.replace(/\s+/g, '.'))

      return normalizedTokens.some(
        (token) => token === email || token === emailName || token === fullName,
      )
    })
    .map((member) => member.profiles.id)
}

export default function TaskDetail({
  task,
  role,
  userId,
  workspaceId,
  workspaceName,
  members,
  sections,
  labels,
  onCreateLabel,
  onCreateSection,
  onClose,
  onSave,
  onDelete,
}) {
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [shareEnabled, setShareEnabled] = useState(Boolean(task?.share_enabled))
  const [shareToken, setShareToken] = useState(task?.share_token || '')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)
  const statusControlRef = useRef(null)
  const shareConfirmationRef = useRef(null)

  const descriptionLines = useMemo(
    () => (task?.description || '').split('\n').filter((line) => line.trim()),
    [task?.description],
  )

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => {
    if (!statusMenuOpen && !shareUrl) return undefined

    const closeFloatingUi = (event) => {
      if (statusMenuOpen && !statusControlRef.current?.contains(event.target)) {
        setStatusMenuOpen(false)
      }

      if (shareUrl && !shareConfirmationRef.current?.contains(event.target)) {
        setShareUrl('')
      }
    }

    document.addEventListener('mousedown', closeFloatingUi)
    return () => document.removeEventListener('mousedown', closeFloatingUi)
  }, [shareUrl, statusMenuOpen])

  useEffect(() => {
    if (!task?.id) return
    setShareEnabled(Boolean(task.share_enabled))
    setShareToken(task.share_token || '')
    setShareUrl('')
    setLoadingComments(true)
    getComments(task.id)
      .then(setComments)
      .finally(() => setLoadingComments(false))
  }, [task?.id, task?.share_enabled, task?.share_token])

  const submitComment = async (event) => {
    event.preventDefault()
    if (!commentText.trim()) return
    const content = commentText.trim()
    const mentionedUserIds = getMentionedUserIds(content, members)
    const created = await addComment(task, userId, content, mentionedUserIds)
    setComments((current) => [...current, created])
    setCommentText('')
  }

  const copyShareLink = async () => {
    const sharedTask = shareEnabled
      ? { share_token: shareToken }
      : await enableTaskSharing(task.id)

    setShareEnabled(true)
    setShareToken(sharedTask.share_token)

    const url = `${window.location.origin}/share/${sharedTask.share_token}`
    setShareUrl(url)
    await navigator.clipboard.writeText(url)
  }

  const changeStatus = async (status) => {
    await onSave({ ...task, status }, undefined, { keepOpen: true })
    setStatusMenuOpen(false)
  }

  const form = (
    <TaskForm
      task={task}
      workspaceId={workspaceId}
      role={role}
      userId={userId}
      members={members}
      sections={sections}
      labels={labels}
      canEditMain={canEditTaskMain(task, role)}
      onCreateLabel={role === 'admin' ? onCreateLabel : null}
      onCreateSection={role === 'admin' ? onCreateSection : null}
      onSubmit={onSave}
      onDelete={canDeleteTask(task, role) ? onDelete : null}
    />
  )

  if (!task?.id) {
    return (
      <div className="modal-backdrop">
        <section className="task-create-modal" aria-label="Create task">
          <div className="drawer-header">
            <div>
              <p className="eyebrow">New issue</p>
              <h2>Create task</h2>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
              X
            </button>
          </div>
          {form}
        </section>
      </div>
    )
  }

  const section = sections.find((item) => item.id === task.section_id)
  const assignee = members.find((member) => member.profiles?.id === task.assigned_to)
  const issueKey = `TF-${task.id.slice(0, 6).toUpperCase()}`

  return (
    <div className="issue-detail-backdrop">
      <section className="issue-detail-page" aria-label="Task details">
        <header className="issue-detail-topbar">
          <div className="breadcrumb-row">
            <span className="project-icon">TF</span>
            <span>TrackFlow</span>
            <span>/</span>
            <span>{workspaceName || 'Workspace'}</span>
            <span>/</span>
            <span>Issues</span>
            <span>/</span>
            <strong>{issueKey}</strong>
          </div>
          <div className="action-row">
            <button type="button" className="ghost-button share-action-button issue-link-button" onClick={copyShareLink}>
              Copy issue link
            </button>
          </div>
        </header>

        <div className="issue-detail-grid">
          <main className="issue-detail-main">
            <article className="issue-content">
              <p className="eyebrow">Issue {issueKey}</p>
              <h1>{task.title}</h1>
              <div className="issue-description">
                {descriptionLines.length > 0 ? (
                  descriptionLines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)
                ) : (
                  <p className="hint">No description yet.</p>
                )}
              </div>

              {shareUrl && (
                <p className="share-confirmation" ref={shareConfirmationRef}>
                  Share link copied. Anyone with this link can open a read-only view of this issue.
                </p>
              )}

              <div className="divider" />
              <section className="comments-section">
                <h3>Activity</h3>
                {loadingComments ? (
                  <p className="hint">Loading comments...</p>
                ) : (
                  <div className="comment-list">
                    {comments.map((comment) => (
                      <article key={comment.id} className="comment activity-comment">
                        <span className="avatar-dot">
                          {(comment.profiles?.full_name || comment.profiles?.email || 'U')
                            .slice(0, 1)
                            .toUpperCase()}
                        </span>
                        <div>
                          <strong>
                            {comment.profiles?.full_name || comment.profiles?.email || 'User'}
                          </strong>
                          <p>{comment.content}</p>
                        </div>
                      </article>
                    ))}
                    {comments.length === 0 && <p className="hint">No activity yet.</p>}
                  </div>
                )}
                <form className="issue-comment-box" onSubmit={submitComment}>
                  <textarea
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Add a comment. Mention @email or @name"
                    rows="4"
                  />
                  <div className="issue-comment-actions">
                    <small>Mention teammates with @email, @username, or @full.name.</small>
                    <button type="submit" className="primary-button">
                      Comment
                    </button>
                  </div>
                </form>
              </section>
            </article>
          </main>

          <aside className="issue-properties">
            <section>
              <h3>Properties</h3>
              <div className="issue-status-control" ref={statusControlRef}>
                <button
                  type="button"
                  className="status-chip-button"
                  onClick={() => setStatusMenuOpen((open) => !open)}
                >
                  <span className={`status-ring status-${task.status}`} />
                  {statusLabel(task.status)}
                </button>
                {statusMenuOpen && (
                  <div className="status-change-menu">
                    <div className="status-menu-header">
                      <span>Change status...</span>
                      <kbd>S</kbd>
                    </div>
                    {STATUSES.map((status, index) => (
                      <button
                        key={status.value}
                        type="button"
                        className={task.status === status.value ? 'active' : ''}
                        onClick={() => changeStatus(status.value)}
                      >
                        <span className={`status-ring status-${status.value}`} />
                        <span>{status.label}</span>
                        <small>{index + 1}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="property-row">
                <span>Priority</span>
                <strong>{priorityLabel(task.priority)}</strong>
              </div>
              <div className="property-row">
                <span>Assignee</span>
                <strong>{assignee?.profiles?.full_name || assignee?.profiles?.email || 'Unassigned'}</strong>
              </div>
              <div className="property-row">
                <span>Due date</span>
                <strong>{task.due_date || 'No due date'}</strong>
              </div>
              <div className="property-row">
                <span>Section</span>
                <strong>{section?.name || 'No section'}</strong>
              </div>
            </section>

            <section>
              <h3>Labels</h3>
              <div className="label-row">
                {task.labels?.map((label) => (
                  <span key={label.id} className="label-pill" style={{ borderColor: label.color }}>
                    {label.name}
                  </span>
                ))}
                {task.labels?.length === 0 && <span className="hint">No labels</span>}
              </div>
            </section>

            <section>
              <h3>Project</h3>
              <div className="property-row">
                <span>Workspace</span>
                <strong>{workspaceName || 'Workspace'}</strong>
              </div>
              <div className="property-row">
                <span>Visibility</span>
                <strong>{task.visibility_role ? roleLabel(task.visibility_role) : 'All members'}</strong>
              </div>
              <div className="share-link-card">
                <strong>External share link</strong>
                <p>Copy a read-only link for sharing this issue outside the workspace.</p>
                <button type="button" className="ghost-button full-width-button share-action-button external-link-button" onClick={copyShareLink}>
                  {shareEnabled ? 'Copy share link' : 'Generate share link'}
                </button>
              </div>
              {canDeleteTask(task, role) && (
                <button type="button" className="danger-button full-width-button" onClick={() => onDelete(task)}>
                  Delete issue
                </button>
              )}
            </section>
          </aside>
        </div>
      </section>
    </div>
  )
}
