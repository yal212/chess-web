'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if Supabase is configured
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase!.auth.getSession()
      if (session?.user) {
        setSupabaseUser(session.user)
        await fetchUserProfile(session.user.id)
      }
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user)
          await fetchUserProfile(session.user.id)
        } else {
          setSupabaseUser(null)
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId: string) => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: userId
        })

        // If user doesn't exist, try to create them
        if (error.code === 'PGRST116') { // No rows returned
          console.log('User not found in users table, attempting to create...')
          await createUserProfile(userId)
          return
        }
        return
      }

      setUser(data)
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const createUserProfile = async (userId: string) => {
    if (!supabase || !supabaseUser) return

    try {
      // Get user info from Supabase auth
      const { data: authUser, error: authError } = await supabase.auth.getUser()

      if (authError) {
        console.error('Error getting auth user:', authError)
        return
      }

      const user = authUser.user
      if (!user) return

      // Extract display name and avatar from user metadata
      const displayName = user.user_metadata?.display_name ||
                         user.user_metadata?.name ||
                         user.user_metadata?.full_name ||
                         user.user_metadata?.given_name ||
                         user.email?.split('@')[0] ||
                         'Anonymous'

      const avatarUrl = user.user_metadata?.avatar_url ||
                       user.user_metadata?.picture

      // Create user profile
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email!,
          display_name: displayName,
          avatar_url: avatarUrl
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: userId,
          email: user.email,
          displayName: displayName
        })
        return
      }

      console.log('User profile created successfully:', data)
      setUser(data)
    } catch (error) {
      console.error('Error creating user profile:', error)
    }
  }

  const signInWithGoogle = async () => {
    try {
      // Check if Supabase is properly configured
      if (!supabase) {
        alert('Please configure Supabase environment variables. See README.md for setup instructions.')
        return
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      if (!supabase) return

      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setSupabaseUser(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signInWithGoogle,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
