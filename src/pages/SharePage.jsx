import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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

  return (
    <main className="share-page">
      <section className="share-card">
        <p className="eyebrow">Shared issue</p>
        {error && <div className="warning-box">{error}</div>}
        {!task && !error && <p>Loading task...</p>}
        {task && (
          <>
            <h1>{task.title}</h1>
            <p className="lead">{task.description || 'No public description.'}</p>
            <div className="task-meta">
              <span className={`priority priority-${task.priority?.toLowerCase()}`}>
                {task.priority}
              </span>
              <span>{task.status}</span>
              <span>{task.due_date || 'No due date'}</span>
            </div>
          </>
        )}
        <Link className="ghost-button" to="/auth">Open TrackFlow</Link>
      </section>
    </main>
  )
}
