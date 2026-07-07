import { useEffect, useState } from 'react'
import { ArrowRight, LockKeyhole, Mail, User, Workflow } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function AuthPage() {
  const { user, signIn, signUp, signInWithGoogle, isSupabaseConfigured } = useAuth()
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = ({ title, message, type = 'success' }) => {
    setToast({ title, message, type })
  }

  if (user) return <Navigate to="/" replace />

  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setToast(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setLoading(false)
      showToast({
        title: 'Password mismatch',
        message: 'Password and confirm password must match.',
        type: 'error',
      })
      return
    }

    const { error } =
      mode === 'login'
        ? await signIn(email, password)
        : await signUp(email, password, { full_name: fullName })

    setLoading(false)
    if (error) {
      showToast({
        title: mode === 'login' ? 'Login failed' : 'Signup failed',
        message: error.message,
        type: 'error',
      })
      return
    }

    showToast({
      title: mode === 'login' ? 'Login successful' : 'Signup successful',
      message:
        mode === 'login'
          ? 'Opening your workspace now.'
          : 'Check your email if confirmation is enabled.',
    })
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="mini-logo" aria-hidden="true">
          <Workflow size={16} />
        </div>

        <div className="auth-heading">
          <h1>{mode === 'login' ? 'Welcome back.' : 'Create account.'}</h1>
        </div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <label className="field">
              <span>Full name</span>
              <div className="auth-input-line">
                <User size={17} aria-hidden="true" />
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </div>
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <div className="auth-input-line">
              <Mail size={17} aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </label>
          <label className="field">
            <span>Password</span>
            <div className="password-line auth-input-line">
              <LockKeyhole size={17} aria-hidden="true" />
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
                  <ArrowRight size={20} aria-hidden="true" />
                </button>
              )}
            </div>
          </label>

          {mode === 'signup' && (
            <label className="field">
              <span>Confirm password</span>
              <div className="password-line auth-input-line">
                <LockKeyhole size={17} aria-hidden="true" />
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
                  <ArrowRight size={20} aria-hidden="true" />
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

      {toast && (
        <div className={`toast-message toast-${toast.type}`} role="status" aria-live="polite">
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button type="button" onClick={() => setToast(null)} aria-label="Close notification">
            X
          </button>
        </div>
      )}
    </main>
  )
}
