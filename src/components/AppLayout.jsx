import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const defaultNavigation = [
  { label: 'Inbox', to: '/dashboard' },
  { label: 'My issues', to: '/dashboard#workspaces' },
  { label: 'Projects', to: '/dashboard#workspaces' },
  { label: 'Views', to: '/dashboard#workspaces' },
  { label: 'More', to: '/dashboard#workspaces' },
]

export default function AppLayout({ children, primaryNavigation, workspaceNavigation }) {
  const { profile, signOut } = useAuth()
  const initial = (profile?.full_name || profile?.email || 'T').slice(0, 1).toUpperCase()
  const navigation = primaryNavigation || defaultNavigation

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/dashboard">
          <span className="brand-mark">{initial}</span>
          <span>
            <strong>{profile?.full_name || 'TrackFlow'}</strong>
            <small>Workspace</small>
          </span>
        </Link>

        <nav className="nav-list">
          {navigation.map((item) => {
            if (item.onClick) {
              return (
                <button
                  key={item.value || item.label}
                  type="button"
                  className={item.active ? 'active' : ''}
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              )
            }

            return (
              <NavLink key={item.value || item.label || item.to} to={item.to}>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {workspaceNavigation && (
          <div className="sidebar-section">
            <span>Workspace</span>
            <nav className="nav-list compact-nav">
              {workspaceNavigation.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={item.active ? 'active' : ''}
                  onClick={item.onClick}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        )}

        <div className="user-panel">
          <div>
            <strong>{profile?.full_name || 'User'}</strong>
            <small>{profile?.email}</small>
          </div>
          <button type="button" className="ghost-button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}
