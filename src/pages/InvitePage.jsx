import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppLayout from '../components/AppLayout'
import { acceptTeamInvite } from '../services/workspaceService'

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const acceptInvite = async () => {
    setLoading(true)
    setMessage('')
    try {
      const workspaceId = await acceptTeamInvite(token)
      navigate(`/workspace/${workspaceId}`)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <main className="invite-page">
        <section className="panel invite-panel">
          <p className="eyebrow">Workspace invite</p>
          <h1>Join this workspace</h1>
          <p className="lead">
            Accept the invitation with the same email address where the invite was sent.
          </p>
          <div className="action-row">
            <button type="button" className="primary-button" onClick={acceptInvite} disabled={loading}>
              {loading ? 'Joining...' : 'Accept invite'}
            </button>
            <Link className="ghost-button" to="/dashboard">
              Back to dashboard
            </Link>
          </div>
          {message && <p className="form-message error">{message}</p>}
        </section>
      </main>
    </AppLayout>
  )
}
