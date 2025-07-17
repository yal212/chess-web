'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User } from '@/lib/supabase'
import { dispatchAuthError, dispatchAuthSuccess } from '@/components/AuthErrorHandler'

interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (updates: Partial<Pick<User, 'display_name' | 'avatar_url'>>) => Promise<void>
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

    // Get initial session with error handling
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase!.auth.getSession()

        if (error) {
          console.error('Error getting initial session:', error)
          dispatchAuthError({
            type: 'session',
            message: 'Failed to get authentication session. Please try signing in again.',
            canRetry: true
          })
          setLoading(false)
          return
        }

        if (session?.user) {
          setSupabaseUser(session.user)
          try {
            await fetchUserProfile(session.user.id)
          } catch (error) {
            console.error('Failed to fetch initial user profile, using fallback:', {
              error,
              errorType: typeof error,
              errorConstructor: error?.constructor?.name,
              errorMessage: (error as any)?.message,
              errorStack: (error as any)?.stack,
              errorStringified: JSON.stringify(error),
              userId: session.user.id
            })
            createFallbackUser(session.user)
          }
        }
      } catch (error) {
        console.error('Unexpected error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes with enhanced error handling
    const { data: { subscription } } = supabase!.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)

        // Handle specific auth events
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully')
          dispatchAuthSuccess()
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
          setSupabaseUser(null)
          setUser(null)
          setLoading(false)
          return
        }

        if (session?.user) {
          setSupabaseUser(session.user)

          // Try to fetch user profile, but don't block on it
          try {
            await fetchUserProfile(session.user.id)
          } catch (error) {
            console.error('Failed to fetch user profile, using fallback:', {
              error,
              errorType: typeof error,
              errorConstructor: error?.constructor?.name,
              errorMessage: (error as any)?.message,
              errorStack: (error as any)?.stack,
              errorStringified: JSON.stringify(error),
              userId: session.user.id
            })
            // Fallback: create user object from auth data
            createFallbackUser(session.user)
          }
        } else {
          setSupabaseUser(null)
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Monitor for cases where we have supabaseUser but no user profile
  useEffect(() => {
    if (supabaseUser && !user && !loading) {
      console.log('Detected auth user without profile, creating fallback user')
      createFallbackUser(supabaseUser)
    }
  }, [supabaseUser, user, loading])

  const createFallbackUser = (authUser: SupabaseUser) => {
    console.log('Creating fallback user from auth data:', authUser.email)

    const displayName = authUser.user_metadata?.display_name ||
                       authUser.user_metadata?.name ||
                       authUser.user_metadata?.full_name ||
                       authUser.user_metadata?.given_name ||
                       authUser.email?.split('@')[0] ||
                       'Anonymous'

    const fallbackUser: User = {
      id: authUser.id,
      email: authUser.email!,
      display_name: displayName,
      avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture,
      created_at: authUser.created_at,
      updated_at: new Date().toISOString()
    }

    setUser(fallbackUser)
    console.log('Fallback user created:', fallbackUser)
  }

  const fetchUserProfile = async (userId: string) => {
    if (!supabase) return

    try {
      // First, let's try to get the current session to ensure we have proper auth
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        console.log('No active session, skipping user profile fetch')
        return
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle() // Use maybeSingle instead of single to avoid errors when no rows

      if (error) {
        console.error('Error fetching user profile:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          userId: userId
        })

        // Handle specific error cases
        if (error.code === 'PGRST116' || error.message.includes('406') || !data) {
          console.log('User not found in users table, attempting to create...')
          await createUserProfile(userId)
          return
        }

        // For other errors, we'll continue without setting user data
        // but won't block the authentication flow
        return
      }

      if (data) {
        setUser(data)
      } else {
        // No user found, try to create one
        console.log('No user data returned, attempting to create user profile...')
        await createUserProfile(userId)
      }
    } catch (error) {
      console.error('Error fetching user profile:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: (error as any)?.message,
        errorStack: (error as any)?.stack,
        errorStringified: JSON.stringify(error),
        userId
      })
      // Don't block auth flow, try to create user profile as fallback
      await createUserProfile(userId)
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

      console.log('Attempting to create user profile:', {
        userId,
        email: user.email,
        displayName,
        avatarUrl
      })

      // Create user profile with upsert to handle conflicts
      const { data, error } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: user.email!,
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
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

        // If we still can't create the user, set a minimal user object
        // so the app doesn't get stuck in a loop
        if (error.message.includes('406') || error.code === 'PGRST301') {
          console.log('Database access issue, using auth user data as fallback')
          setUser({
            id: userId,
            email: user.email!,
            display_name: displayName,
            avatar_url: avatarUrl,
            created_at: user.created_at,
            updated_at: new Date().toISOString()
          })
        }
        return
      }

      console.log('User profile created successfully:', data)
      setUser(data)
    } catch (error) {
      console.error('Error creating user profile:', {
        error,
        errorType: typeof error,
        errorConstructor: error?.constructor?.name,
        errorMessage: (error as any)?.message,
        errorStack: (error as any)?.stack,
        errorStringified: JSON.stringify(error),
        userId
      })

      // Fallback: use the auth user data to prevent infinite loops
      if (supabaseUser) {
        const displayName = supabaseUser.user_metadata?.display_name ||
                           supabaseUser.user_metadata?.name ||
                           supabaseUser.user_metadata?.full_name ||
                           supabaseUser.email?.split('@')[0] ||
                           'Anonymous'

        setUser({
          id: userId,
          email: supabaseUser.email!,
          display_name: displayName,
          avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture,
          created_at: supabaseUser.created_at,
          updated_at: new Date().toISOString()
        })
      }
    }
  }

  const signInWithGoogle = async () => {
    try {
      // Check if Supabase is properly configured
      if (!supabase) {
        alert('Please configure Supabase environment variables. See README.md for setup instructions.')
        return
      }

      // Get the correct redirect URL based on environment
      // Always use the current origin to avoid hardcoded URLs
      const redirectUrl = `${window.location.origin}/auth/callback`

      console.log('Attempting Google OAuth with redirect URL:', redirectUrl)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      // Check if Supabase is properly configured
      if (!supabase) {
        throw new Error('Please configure Supabase environment variables. See README.md for setup instructions.')
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Error signing in with email:', error)
        throw error
      }
    } catch (error) {
      console.error('Error signing in with email:', error)
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      // Check if Supabase is properly configured
      if (!supabase) {
        throw new Error('Please configure Supabase environment variables. See README.md for setup instructions.')
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            name: displayName
          }
        }
      })

      if (error) {
        console.error('Error signing up with email:', error)
        throw error
      }
    } catch (error) {
      console.error('Error signing up with email:', error)
      throw error
    }
  }

  const resetPassword = async (email: string) => {
    try {
      // Check if Supabase is properly configured
      if (!supabase) {
        throw new Error('Please configure Supabase environment variables. See README.md for setup instructions.')
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })

      if (error) {
        console.error('Error resetting password:', error)
        throw error
      }
    } catch (error) {
      console.error('Error resetting password:', error)
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

  const updateUserProfile = async (updates: Partial<Pick<User, 'display_name' | 'avatar_url'>>) => {
    if (!supabase || !user) {
      throw new Error('User not authenticated or Supabase not configured')
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error)
        throw error
      }

      // Update the local user state
      setUser(data)
    } catch (error) {
      console.error('Error updating user profile:', error)
      throw error
    }
  }

  const value = {
    user,
    supabaseUser,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    updateUserProfile
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
