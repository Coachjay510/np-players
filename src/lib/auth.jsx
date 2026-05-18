import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(undefined) // undefined = loading
  const [player, setPlayer]   = useState(null)       // linked players row

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPlayer(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadPlayer(session.user.id)
      else setPlayer(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadPlayer(userId) {
    const { data } = await supabase
      .from('players')
      .select('id, name, photo_url')
      .eq('user_id', userId)
      .maybeSingle()
    setPlayer(data)
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, player, signInWithGoogle, signOut, loadPlayer }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
