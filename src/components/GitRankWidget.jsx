import { useState } from 'react'
import { supabase } from '../lib/supabase'

const Icons = {
  Location: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  ),
  Company: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
  ),
  Link: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
  )
}

export default function GitRankWidget() {
  const [username, setUsername] = useState('')
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!username.trim()) return

    setLoading(true)
    setError('')
    setUserData(null)

    try {
      const { data, error: functionError } = await supabase.functions.invoke('git-tracker', {
        body: { username }
      })

      if (functionError) {
        throw new Error(functionError.message || 'Failed to fetch user data')
      }

      if (data.error) {
         throw new Error(data.error)
      }

      setUserData(data)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const formatUrl = (url) => {
    if (!url) return ''
    return url.startsWith('http') ? url : `https://${url}`
  }

  return (
    <div className="git-rank-widget widget-panel">
      <header>
        <h1>GitRank</h1>
        <p>GitHub Profile Discovery</p>
      </header>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="GitHub username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? <div className="spinner"></div> : "Search"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {userData && (
        <div className="profile-card">
          <div className="avatar-container">
            <img 
              src={userData.avatar_url} 
              alt={`${userData.login}'s avatar`} 
              className="avatar" 
            />
          </div>
          
          <div className="profile-info">
            <div className="profile-header" style={{textAlign: "center"}}>
              <div className="profile-name">
                <h2>{userData.name || userData.login}</h2>
                <a href={userData.html_url} target="_blank" rel="noopener noreferrer" className="username-link">
                  @{userData.login}
                </a>
              </div>
            </div>

            {userData.bio && (
              <p className="bio" style={{textAlign: "center"}}>{userData.bio.substring(0, 100)}{userData.bio.length > 100 ? '...' : ''}</p>
            )}
            
            <div className="details-grid">
              {userData.location && (
                <div className="detail-item">
                  <Icons.Location />
                  <span>{userData.location}</span>
                </div>
              )}
              
              {userData.company && (
                <div className="detail-item">
                  <Icons.Company />
                  <span>{userData.company}</span>
                </div>
              )}
              
              {userData.blog && (
                <div className="detail-item">
                  <Icons.Link />
                  <a href={formatUrl(userData.blog)} target="_blank" rel="noopener noreferrer">
                    {userData.blog.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
            </div>

            <div className="stats-card">
              <div className="stat">
                <span className="stat-value">{userData.public_repos}</span>
                <span className="stat-label">Repos</span>
              </div>
              <div className="stat">
                <span className="stat-value">{userData.followers}</span>
                <span className="stat-label">Followers</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
