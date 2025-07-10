'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/layout/Navigation'

export default function DebugPage() {
  const { user, supabaseUser } = useAuth()
  const [diagnostics, setDiagnostics] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    runDiagnostics()
  }, [user])

  const runDiagnostics = async () => {
    const results: any = {
      timestamp: new Date().toISOString(),
      supabaseConfigured: !!supabase,
      userFromContext: !!user,
      supabaseUserFromContext: !!supabaseUser,
      userDetails: user,
      supabaseUserDetails: supabaseUser
    }

    if (supabase) {
      try {
        // Test connection
        const { data: session } = await supabase.auth.getSession()
        results.sessionExists = !!session.session
        results.sessionUser = session.session?.user

        // Check if users table exists and user is in it
        if (user) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single()
            
            results.userInDatabase = !userError && !!userData
            results.userDatabaseData = userData
            results.userDatabaseError = userError
          } catch (error) {
            results.userInDatabase = false
            results.userDatabaseError = error
          }

          // Check if games table exists
          try {
            const { data: gamesTest, error: gamesError } = await supabase
              .from('games')
              .select('count', { count: 'exact', head: true })
            
            results.gamesTableExists = !gamesError
            results.gamesTableError = gamesError
          } catch (error) {
            results.gamesTableExists = false
            results.gamesTableError = error
          }

          // Test game creation (dry run)
          if (results.gamesTableExists && results.userInDatabase) {
            try {
              const { data: gameData, error: gameError } = await supabase
                .from('games')
                .insert({
                  white_player_id: user.id,
                  status: 'waiting'
                })
                .select()
                .single()
              
              results.gameCreationTest = !gameError
              results.gameCreationError = gameError
              
              // If successful, delete the test game
              if (gameData && !gameError) {
                await supabase.from('games').delete().eq('id', gameData.id)
                results.testGameDeleted = true
              }
            } catch (error) {
              results.gameCreationTest = false
              results.gameCreationError = error
            }
          }
        }
      } catch (error) {
        results.supabaseConnectionError = error
      }
    }

    setDiagnostics(results)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Running diagnostics...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Debug Information</h1>
          <p className="text-lg text-gray-600">Diagnostic information for troubleshooting</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-3 rounded ${diagnostics.supabaseConfigured ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="font-medium">Supabase Configured:</span> {diagnostics.supabaseConfigured ? '✅' : '❌'}
              </div>
              <div className={`p-3 rounded ${diagnostics.userFromContext ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="font-medium">User Loaded:</span> {diagnostics.userFromContext ? '✅' : '❌'}
              </div>
              <div className={`p-3 rounded ${diagnostics.sessionExists ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="font-medium">Session Active:</span> {diagnostics.sessionExists ? '✅' : '❌'}
              </div>
              <div className={`p-3 rounded ${diagnostics.userInDatabase ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="font-medium">User in Database:</span> {diagnostics.userInDatabase ? '✅' : '❌'}
              </div>
              <div className={`p-3 rounded ${diagnostics.gamesTableExists ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="font-medium">Games Table Exists:</span> {diagnostics.gamesTableExists ? '✅' : '❌'}
              </div>
              <div className={`p-3 rounded ${diagnostics.gameCreationTest ? 'bg-green-100' : 'bg-red-100'}`}>
                <span className="font-medium">Game Creation Test:</span> {diagnostics.gameCreationTest ? '✅' : '❌'}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Information</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(diagnostics, null, 2)}
            </pre>
          </div>

          <div className="mt-6">
            <button
              onClick={runDiagnostics}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Diagnostics
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
