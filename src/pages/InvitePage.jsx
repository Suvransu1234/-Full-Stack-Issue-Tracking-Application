import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { acceptTeamInvite, getTeamInvite } from '../services/workspaceService'

export default function InvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { profile, user, signOut } = useAuth()
  const [invite, setInvite] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const currentEmail = profile?.email || user?.email
  const workspaceName = invite?.workspaces?.name || 'Invited workspace'
  const roleLabel = invite?.role?.replace('_', ' ') || 'workspace member'

  useEffect(() => {
    let active = true

    getTeamInvite(token)
      .then((data) => {
        if (active) {
          setInvite(data)
        }
      })
      .catch(() => {
        if (active) {
          setInvite(null)
        }
      })
      .finally(() => {
        if (active) {
          setInviteLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [token])

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
      navigate(`/workspace/${workspaceId}?view=board`, { replace: true })
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
          Accept this invite with the email account shown below. After accepting, this
          workspace and its issues will appear in your app.
        </p>

        <div className="invite-current-user">
          <span>Signed in as</span>
          <strong>{currentEmail}</strong>
        </div>

        <div className="invite-current-user invite-target">
          <span>{inviteLoading ? 'Checking invite' : 'Invite details'}</span>
          <strong>{inviteLoading ? 'Loading workspace...' : workspaceName}</strong>
          <small>
            {invite?.email
              ? `Invited email: ${invite.email} as ${roleLabel}`
              : 'Invite details are visible only to the invited account.'}
          </small>
        </div>

        <div className="action-row">
          <button type="button" className="primary-button" onClick={acceptInvite} disabled={loading}>
            {loading ? 'Joining...' : 'Accept invite'}
          </button>
          <button type="button" className="ghost-button" onClick={useAnotherAccount}>
            Use another email
          </button>
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
