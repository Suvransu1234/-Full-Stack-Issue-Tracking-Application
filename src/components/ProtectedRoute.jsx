import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="screen-message">Loading your workspace...</div>
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return children
}
