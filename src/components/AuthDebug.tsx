'use client'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function AuthDebug() {
  const { user, supabaseUser, loading } = useAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isDebugging, setIsDebugging] = useState(false)
  const [authLogs, setAuthLogs] = useState<string[]>([])

  // Capture console logs related to authentication
  useEffect(() => {
    const originalConsoleError = console.error
    const originalConsoleLog = console.log

    console.error = (...args) => {
      const message = args.join(' ')
      if (message.includes('auth') || message.includes('user') || message.includes('profile') || message.includes('Error')) {
        setAuthLogs(prev => [...prev.slice(-9), `ERROR: ${message}`])
      }
      originalConsoleError(...args)
    }

    console.log = (...args) => {
      const message = args.join(' ')
      if (message.includes('auth') || message.includes('user') || message.includes('profile') || message.includes('User')) {
        setAuthLogs(prev => [...prev.slice(-9), `LOG: ${message}`])
      }
      originalConsoleLog(...args)
    }

    return () => {
      console.error = originalConsoleError
      console.log = originalConsoleLog
    }
  }, [])

  const runDebugCheck = async () => {
    if (!supabase) {
      setDebugInfo({ error: 'Supabase not configured' })
      return
    }

    setIsDebugging(true)
    const info: any = {}

    try {
      // Check current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      info.session = {
        exists: !!sessionData.session,
        user: sessionData.session?.user ? {
          id: sessionData.session.user.id,
          email: sessionData.session.user.email,
          metadata: sessionData.session.user.user_metadata
        } : null,
        error: sessionError
      }

      // Check user profile in database
      if (sessionData.session?.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single()

        info.userProfile = {
          exists: !!userProfile,
          data: userProfile,
          error: profileError ? {
            message: profileError.message,
            code: profileError.code,
            details: profileError.details,
            hint: profileError.hint
          } : null
        }

        // Try to manually create user if missing
        if (profileError?.code === 'PGRST116') {
          const user = sessionData.session.user
          const displayName = user.user_metadata?.display_name || 
                             user.user_metadata?.name || 
                             user.user_metadata?.full_name ||
                             user.user_metadata?.given_name ||
                             user.email?.split('@')[0] || 
                             'Anonymous'

          const avatarUrl = user.user_metadata?.avatar_url || 
                           user.user_metadata?.picture

          const { data: createdUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email!,
              display_name: displayName,
              avatar_url: avatarUrl
            })
            .select()
            .single()

          info.userCreation = {
            attempted: true,
            success: !!createdUser,
            data: createdUser,
            error: createError ? {
              message: createError.message,
              code: createError.code,
              details: createError.details,
              hint: createError.hint
            } : null
          }
        }
      }

      // Check all users in database
      const { data: allUsers, error: allUsersError } = await supabase
        .from('users')
        .select('id, email, display_name, created_at')
        .limit(10)

      info.allUsers = {
        count: allUsers?.length || 0,
        data: allUsers,
        error: allUsersError
      }

    } catch (error) {
      info.error = error
    }

    setDebugInfo(info)
    setIsDebugging(false)
  }

  if (!supabase) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="font-bold text-red-800">Supabase Not Configured</h3>
        <p className="text-red-600">Please check your environment variables.</p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="font-bold text-gray-800 mb-4">Authentication Debug Info</h3>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold">Auth Context State:</h4>
          <pre className="text-sm bg-white p-2 rounded border overflow-auto">
            {JSON.stringify({
              loading,
              hasUser: !!user,
              hasSupabaseUser: !!supabaseUser,
              userEmail: user?.email || supabaseUser?.email,
              userId: user?.id || supabaseUser?.id,
              userDisplayName: user?.display_name,
              userAvatarUrl: user?.avatar_url,
              supabaseUserMetadata: supabaseUser?.user_metadata
            }, null, 2)}
          </pre>
        </div>

        {authLogs.length > 0 && (
          <div>
            <h4 className="font-semibold">Recent Auth Logs:</h4>
            <div className="text-sm bg-white p-2 rounded border max-h-32 overflow-auto">
              {authLogs.map((log, index) => (
                <div key={index} className={`mb-1 ${log.startsWith('ERROR:') ? 'text-red-600' : 'text-gray-600'}`}>
                  {log}
                </div>
              ))}
            </div>
            <button
              onClick={() => setAuthLogs([])}
              className="mt-2 px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Clear Logs
            </button>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={runDebugCheck}
            disabled={isDebugging}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isDebugging ? 'Running Debug Check...' : 'Run Debug Check'}
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Refresh Page
          </button>
        </div>

        {debugInfo && (
          <div>
            <h4 className="font-semibold">Debug Results:</h4>
            <pre className="text-sm bg-white p-2 rounded border overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
