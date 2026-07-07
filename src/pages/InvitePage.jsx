import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { acceptTeamInvite } from '../services/workspaceService'

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { profile, user, signOut } = useAuth()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const currentEmail = profile?.email || user?.email

  const getFriendlyInviteError = (error) => {
    if (error.message?.includes('different email')) {
      return 'This invite was created for another email address. Sign out and log in with the invited email, then open this link again.'
    }

    if (error.message?.includes('invalid') || error.message?.includes('expired')) {
      return 'This invite link is invalid or expired. Ask the workspace Admin to send a new invite.'
    }

    return 'Unable to accept this invite right now. Please try again.'
  }

  const acceptInvite = async () => {
    setLoading(true)
    setMessage('')
    try {
      const workspaceId = await acceptTeamInvite(token)
      navigate(`/workspace/${workspaceId}`)
    } catch (error) {
      setMessage(getFriendlyInviteError(error))
    } finally {
      setLoading(false)
    }
  }

  const useAnotherAccount = async () => {
    await signOut()
    navigate('/auth', { replace: true })
  }

  return (
    <main className="invite-page">
      <section className="panel invite-panel">
        <p className="eyebrow">Workspace invite</p>
        <h1>Join this workspace</h1>
        <p className="lead">
          Accept this invite using the same email address where the invitation was sent.
        </p>

        <div className="invite-current-user">
          <span>Signed in as</span>
          <strong>{currentEmail}</strong>
        </div>

        <div className="action-row">
          <button type="button" className="primary-button" onClick={acceptInvite} disabled={loading}>
            {loading ? 'Joining...' : 'Accept invite'}
          </button>
          <button type="button" className="ghost-button" onClick={useAnotherAccount}>
            Use another email
          </button>
          <Link className="ghost-button" to="/dashboard">
            Back to projects
          </Link>
        </div>

        {message && (
          <div className="invite-error-box">
            <strong>Invite could not be accepted</strong>
            <p>{message}</p>
          </div>
        )}
      </section>
    </main>
  )
}
