import { roleLabel } from '../lib/constants'

export default function SettingsModal({
  profile,
  user,
  role,
  workspaceName,
  onClose,
  onSignOut,
}) {
  return (
    <div className="settings-modal-backdrop">
      <section className="settings-modal" aria-label="User settings">
        <header className="settings-modal-header">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>User profile</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close settings">
            X
          </button>
        </header>

        <div className="settings-profile-card">
          <span className="profile-avatar">
            {(profile?.full_name || profile?.email || user?.email || 'U').slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{profile?.full_name || 'User'}</strong>
            <small>{profile?.email || user?.email}</small>
          </div>
        </div>

        {role && (
          <div className="settings-row">
            <span>Workspace role</span>
            <strong>{roleLabel(role)}</strong>
          </div>
        )}
        {workspaceName && (
          <div className="settings-row">
            <span>Current workspace</span>
            <strong>{workspaceName}</strong>
          </div>
        )}
        <div className="settings-row">
          <span>Email</span>
          <strong>{profile?.email || user?.email}</strong>
        </div>

        <div className="settings-modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="danger-button" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
