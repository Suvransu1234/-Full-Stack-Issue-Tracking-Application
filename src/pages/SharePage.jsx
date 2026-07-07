import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { priorityLabel, statusLabel } from '../lib/constants'
import { getPublicTaskByToken } from '../services/workspaceService'

export default function SharePage() {
  const { token } = useParams()
  const [task, setTask] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getPublicTaskByToken(token)
      .then(setTask)
      .catch((err) => setError(err.message))
  }, [token])

  const descriptionLines = (task?.description || '').split('\n').filter((line) => line.trim())

  if (error) {
    return (
      <main className="share-page">
        <section className="share-card">
          <p className="eyebrow">Shared issue</p>
          <h1>Link unavailable</h1>
          <div className="warning-box">{error}</div>
          <Link className="ghost-button" to="/auth">Open TrackFlow</Link>
        </section>
      </main>
    )
  }

  if (!task) {
    return <div className="screen-message">Loading shared issue...</div>
  }

  return (
    <main className="public-issue-detail issue-detail-page">
      <header className="issue-detail-topbar">
        <div className="breadcrumb-row">
          <span className="project-icon">TF</span>
          <span>TrackFlow</span>
          <span>/</span>
          <strong>{task.title}</strong>
        </div>
        <Link className="ghost-button" to="/auth">Open TrackFlow</Link>
      </header>

      <div className="issue-detail-grid">
        <main className="issue-detail-main">
          <article className="issue-content">
            <p className="eyebrow">Shared issue</p>
            <h1>{task.title}</h1>
            <div className="issue-description">
              {descriptionLines.length > 0 ? (
                descriptionLines.map((line, index) => <p key={`${index}-${line}`}>{line}</p>)
              ) : (
                <p className="hint">No public description.</p>
              )}
            </div>

            <div className="divider" />
            <section className="comments-section">
              <h3>Activity</h3>
              <p className="hint">Sign in to TrackFlow to comment or collaborate on this issue.</p>
            </section>
          </article>
        </main>

        <aside className="issue-properties">
          <section>
            <h3>Properties</h3>
            <div className="issue-status-control">
              <span className="status-chip-button">
                <span className={`status-ring status-${task.status}`} />
                {statusLabel(task.status)}
              </span>
            </div>
            <div className="property-row">
              <span>Priority</span>
              <strong>{priorityLabel(task.priority)}</strong>
            </div>
            <div className="property-row">
              <span>Due date</span>
              <strong>{task.due_date || 'No due date'}</strong>
            </div>
            <div className="property-row">
              <span>Section</span>
              <strong>{task.sections?.name || 'No section'}</strong>
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
            <h3>Sharing</h3>
            <div className="property-row">
              <span>Access</span>
              <strong>Public link</strong>
            </div>
            <Link className="ghost-button full-width-button" to="/auth">Sign in</Link>
          </section>
        </aside>
      </div>
    </main>
  )
}
