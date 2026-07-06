import { useCallback, useEffect, useMemo, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { AuthContext } from './AuthContextBase'

const buildProfilePayload = (user) => ({
  id: user.id,
  email: user.email,
  full_name:
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User',
  avatar_url: user.user_metadata?.avatar_url || null,
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const ensureProfile = useCallback(async (user) => {
    if (!supabase || !user) return null

    const payload = buildProfilePayload(user)
    await supabase.from('profiles').upsert(payload, { onConflict: 'id' })

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(data || payload)
    return data || payload
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        await ensureProfile(data.session.user)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        setSession(nextSession)
        if (nextSession?.user) {
          await ensureProfile(nextSession.user)
        } else {
          setProfile(null)
        }
        setLoading(false)
      },
    )

    return () => listener.subscription.unsubscribe()
  }, [ensureProfile])

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      loading,
      isSupabaseConfigured,
      signUp: (email, password, metadata = {}) =>
        supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata,
          },
        }),
      signIn: (email, password) =>
        supabase.auth.signInWithPassword({ email, password }),
      signInWithGoogle: () =>
        supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
          },
        }),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
