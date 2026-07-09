import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="screen-message">Loading your workspace...</div>
  }

  if (!user) {
    const nextPath = `${location.pathname}${location.search}`
    return <Navigate to={`/auth?redirect=${encodeURIComponent(nextPath)}`} replace />
  }

  return children
}
