import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function AuthPage() {
  const { user, signIn, signUp, signInWithGoogle, isSupabaseConfigured } = useAuth()
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    if (mode === 'signup' && password !== confirmPassword) {
      setLoading(false)
      setMessage('Password and confirm password must match.')
      return
    }

    const { error } =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password, { full_name: fullName })

    setLoading(false)
    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(
      mode === 'login'
        ? 'Login successful.'
        : 'Signup successful. Check your email if confirmation is enabled.',
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="mini-logo" aria-hidden="true">
          TF
        </div>

        <div className="auth-heading">
          <h1>{mode === 'login' ? 'Welcome back.' : 'Create account.'}</h1>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="field">
              <span>Full name</span>
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="password-line">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {mode === 'login' && (
                <button
                  type="submit"
                  className="arrow-submit"
                  disabled={loading || !isSupabaseConfigured}
                  aria-label="Login"
                >
                  -&gt;
                </button>
              )}
            </div>
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>Confirm password</span>
              <div className="password-line">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                <button
                  type="submit"
                  className="arrow-submit"
                  disabled={loading || !isSupabaseConfigured}
                  aria-label="Create account"
                >
                  -&gt;
                </button>
              </div>
            </label>
          )}
        </form>

        <p className="auth-helper">
          {mode === 'login' ? 'Sign in with your password.' : 'Sign up with your email.'}
        </p>

        <div className="social-row">
          <button
            type="button"
            className="social-button"
            onClick={signInWithGoogle}
            disabled={!isSupabaseConfigured}
          >
            <span>G</span>
            Google
          </button>
          <button type="button" className="social-button" disabled>
            <span>M</span>
            Microsoft
          </button>
        </div>

        {message && <p className="form-message">{message}</p>}

        {!isSupabaseConfigured && (
          <div className="warning-box">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local
            before using login.
          </div>
        )}

        <div className="auth-links">
          {mode === 'login' ? (
            <>
              <button type="button">Use a sign-in link</button>
              <span>.</span>
              <button type="button">Forgot password?</button>
              <span>.</span>
              <button type="button" onClick={() => setMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setMode('login')}>
                Login
              </button>
              <span>.</span>
              <button type="button" onClick={signInWithGoogle} disabled={!isSupabaseConfigured}>
                Use Google instead
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
