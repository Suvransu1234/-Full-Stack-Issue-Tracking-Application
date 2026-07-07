import {
  CircleDot,
  CircleUserRound,
  FolderKanban,
  Inbox,
  Layers,
  List,
  MoreHorizontal,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const defaultNavigation = [
  { label: 'Inbox', to: '/dashboard' },
  { label: 'My issues', to: '/dashboard#workspaces' },
  { label: 'Projects', to: '/dashboard#workspaces' },
  { label: 'Views', to: '/dashboard#workspaces' },
  { label: 'More', to: '/dashboard#workspaces' },
]

const navIcons = {
  inbox: Inbox,
  'my issues': CircleUserRound,
  projects: FolderKanban,
  views: Layers,
  more: MoreHorizontal,
  settings: Settings,
  board: CircleDot,
  list: List,
  team: Users,
  setup: SlidersHorizontal,
}

const getNavigationIcon = (item) => {
  const key = item.value || item.label?.toLowerCase()
  return navIcons[key] || CircleDot
}

const renderNavigationContent = (item) => {
  const Icon = getNavigationIcon(item)
  return (
    <>
      <Icon size={16} aria-hidden="true" />
      <span>{item.label}</span>
    </>
  )
}

export default function AppLayout({ children, primaryNavigation, workspaceNavigation }) {
  const { profile } = useAuth()
  const navigation = primaryNavigation || defaultNavigation
  const settingsItem = navigation.find((item) => item.value === 'settings' || item.label === 'Settings')
  const visibleNavigation = navigation.filter((item) => item !== settingsItem)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/dashboard">
          <span className="brand-mark">
            <img src="/trackflow-logo.svg" alt="" />
          </span>
          <span>
            <strong>{profile?.full_name || 'TrackFlow'}</strong>
            <small>Workspace</small>
          </span>
        </Link>

        <nav className="nav-list">
          {visibleNavigation.map((item) => {
            if (item.onClick) {
              return (
                <button
                  key={item.value || item.label}
                  type="button"
                  className={item.active ? 'active' : ''}
                  onClick={item.onClick}
                >
                  {renderNavigationContent(item)}
                </button>
              )
            }

            return (
              <NavLink key={item.value || item.label || item.to} to={item.to}>
                {renderNavigationContent(item)}
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
                  {renderNavigationContent(item)}
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
          {settingsItem?.onClick && (
            <button
              type="button"
              className={`user-settings-link ${settingsItem.active ? 'active' : ''}`}
              onClick={settingsItem.onClick}
            >
              {renderNavigationContent(settingsItem)}
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  )
}
