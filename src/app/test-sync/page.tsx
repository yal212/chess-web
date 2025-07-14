'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/layout/Navigation'
import { testRealtimeSync, testMoveSync, checkRealtimeConfig } from '@/utils/test-realtime-sync'
import { runRealtimeDiagnostics, quickRealtimeTest } from '@/utils/realtime-diagnostics'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'success' | 'error'
  message?: string
  details?: any
}

export default function TestSyncPage() {
  const { user } = useAuth()

  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Page Not Found
            </h1>
            <p className="text-gray-600">This page is only available in development mode.</p>
          </div>
        </div>
      </div>
    )
  }

  const [testResults, setTestResults] = useState<TestResult[]>([
    { name: 'Supabase Connection', status: 'pending' },
    { name: 'Real-time Configuration', status: 'pending' },
    { name: 'Real-time Subscription', status: 'pending' },
    { name: 'Move Synchronization', status: 'pending' }
  ])
  const [selectedGameId, setSelectedGameId] = useState('')
  const [availableGames, setAvailableGames] = useState<any[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)

  useEffect(() => {
    if (user) {
      fetchAvailableGames()
    }
  }, [user])

  const fetchAvailableGames = async () => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .from('games')
        .select('id, status, white_player:users!games_white_player_id_fkey(display_name), black_player:users!games_black_player_id_fkey(display_name)')
        .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setAvailableGames(data || [])
    } catch (error) {
      console.error('Error fetching games:', error)
    }
  }

  const updateTestResult = (index: number, status: TestResult['status'], message?: string, details?: any) => {
    setTestResults(prev => prev.map((result, i) => 
      i === index ? { ...result, status, message, details } : result
    ))
  }

  const runAllTests = async () => {
    if (!user) {
      alert('Please log in to run tests')
      return
    }

    setIsRunningTests(true)

    try {
      // Test 1: Supabase Connection
      updateTestResult(0, 'running')
      try {
        const { data, error } = await supabase.from('games').select('count').limit(1)
        if (error) throw error
        updateTestResult(0, 'success', 'Successfully connected to Supabase')
      } catch (error) {
        updateTestResult(0, 'error', `Connection failed: ${error.message}`)
        return
      }

      // Test 2: Real-time Configuration
      updateTestResult(1, 'running')
      try {
        const configResult = await checkRealtimeConfig()
        if (configResult) {
          updateTestResult(1, 'success', 'Real-time configuration is working')
        } else {
          updateTestResult(1, 'error', 'Real-time configuration has issues')
        }
      } catch (error) {
        updateTestResult(1, 'error', `Config check failed: ${error.message}`)
      }

      // Test 3: Real-time Subscription
      updateTestResult(2, 'running')
      try {
        const syncResult = await testRealtimeSync()
        if (syncResult) {
          updateTestResult(2, 'success', 'Real-time subscription is working')
        } else {
          updateTestResult(2, 'error', 'Real-time subscription is not working')
        }
      } catch (error) {
        updateTestResult(2, 'error', `Subscription test failed: ${error.message}`)
      }

      // Test 4: Move Synchronization (only if a game is selected)
      updateTestResult(3, 'running')
      if (selectedGameId) {
        try {
          const moveResult = await testMoveSync(selectedGameId)
          if (moveResult) {
            updateTestResult(3, 'success', 'Move synchronization is working')
          } else {
            updateTestResult(3, 'error', 'Move synchronization is not working')
          }
        } catch (error) {
          updateTestResult(3, 'error', `Move sync test failed: ${error.message}`)
        }
      } else {
        updateTestResult(3, 'error', 'No game selected for move sync test')
      }

    } finally {
      setIsRunningTests(false)
    }
  }

  const createTestGame = async () => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          white_player_id: user.id,
          game_state: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          status: 'waiting'
        })
        .select()
        .single()

      if (error) throw error

      alert(`Test game created with ID: ${data.id}`)
      setSelectedGameId(data.id)
      fetchAvailableGames()
    } catch (error) {
      console.error('Error creating test game:', error)
      alert(`Failed to create test game: ${error.message}`)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Real-time Sync Test</h1>
            <p className="text-gray-600">Please log in to run synchronization tests.</p>
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
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Real-time Synchronization Test
          </h1>
          <p className="text-gray-600">
            Test the real-time synchronization functionality between players.
          </p>
        </div>

        {/* Game Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Test Game</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Games
              </label>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a game...</option>
                {availableGames.map((game) => (
                  <option key={game.id} value={game.id}>
                    {game.id} - {game.status} - vs {game.black_player?.display_name || 'Waiting...'}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={createTestGame}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Create Test Game
            </button>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Tests</h2>
          
          <button
            onClick={runAllTests}
            disabled={isRunningTests}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isRunningTests ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Results</h2>
          
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-4 h-4 rounded-full ${
                    result.status === 'pending' ? 'bg-gray-300' :
                    result.status === 'running' ? 'bg-yellow-400 animate-pulse' :
                    result.status === 'success' ? 'bg-green-500' :
                    'bg-red-500'
                  }`} />
                  <span className="font-medium text-gray-900">{result.name}</span>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    result.status === 'success' ? 'text-green-600' :
                    result.status === 'error' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {result.status.toUpperCase()}
                  </div>
                  {result.message && (
                    <div className="text-xs text-gray-500 mt-1">{result.message}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Testing Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Create or select a test game above</li>
            <li>Run the automated tests to check basic functionality</li>
            <li>Open the game in two different browser windows/tabs</li>
            <li>Make moves in one window and verify they appear in the other</li>
            <li>Check the browser console for detailed logging</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
