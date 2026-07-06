import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getMyWorkspaces } from '../services/workspaceService'

export default function DefaultWorkspacePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const openDefaultWorkspace = async () => {
      try {
        const workspaces = await getMyWorkspaces(user.id)
        if (workspaces.length === 0) {
          navigate('/dashboard', { replace: true })
          return
        }

        const defaultWorkspaceId = window.localStorage.getItem('trackflow_default_workspace_id')
        const defaultWorkspace =
          workspaces.find((workspace) => workspace.id === defaultWorkspaceId) || workspaces[0]

        navigate(`/workspace/${defaultWorkspace.id}`, { replace: true })
      } catch (err) {
        setError(err.message)
      }
    }

    openDefaultWorkspace()
  }, [navigate, user.id])

  return <div className="screen-message">{error || 'Opening your workspace...'}</div>
}
