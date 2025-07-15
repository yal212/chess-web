'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { runRealtimeTests, RealtimeTestResult } from '@/utils/realtime-test'

interface RealtimeDebuggerProps {
  gameId: string
}

export default function RealtimeDebugger({ gameId }: RealtimeDebuggerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [testResults, setTestResults] = useState<RealtimeTestResult[]>([])
  const [isRunningTests, setIsRunningTests] = useState(false)
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([])
  const [subscription, setSubscription] = useState<any>(null)

  useEffect(() => {
    if (!supabase || !gameId) return

    // Set up real-time monitoring
    const sub = supabase
      .channel(`debug-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          console.log('🐛 Debug: Real-time event received:', payload)
          setRealtimeEvents(prev => [...prev, {
            timestamp: new Date().toISOString(),
            event: payload.eventType,
            payload
          }])
        }
      )
      .subscribe((status) => {
        console.log('🐛 Debug: Subscription status:', status)
      })

    setSubscription(sub)

    return () => {
      if (sub) {
        sub.unsubscribe()
      }
    }
  }, [gameId])

  const runTests = async () => {
    setIsRunningTests(true)
    setTestResults([])
    
    try {
      const results = await runRealtimeTests(gameId)
      setTestResults(results)
    } catch (error) {
      console.error('Test execution failed:', error)
      setTestResults([{
        success: false,
        message: `Test execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      }])
    } finally {
      setIsRunningTests(false)
    }
  }

  const clearEvents = () => {
    setRealtimeEvents([])
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg hover:bg-red-700 z-50"
      >
        🐛 Debug
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 w-96 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-900">Real-time Debugger</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* Test Controls */}
        <div>
          <button
            onClick={runTests}
            disabled={isRunningTests}
            className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isRunningTests ? 'Running Tests...' : 'Run Real-time Tests'}
          </button>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Test Results:</h4>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-2 rounded text-xs ${
                    result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  <div className="font-medium">
                    {result.success ? '✅' : '❌'} Test {index + 1}
                  </div>
                  <div>{result.message}</div>
                  {result.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer">Details</summary>
                      <pre className="mt-1 text-xs overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Real-time Events */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-semibold text-sm text-gray-700">
              Real-time Events ({realtimeEvents.length})
            </h4>
            <button
              onClick={clearEvents}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          
          {realtimeEvents.length === 0 ? (
            <div className="text-xs text-gray-500 italic">No events received yet</div>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {realtimeEvents.slice(-5).map((event, index) => (
                <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                  <div className="font-medium text-gray-700">
                    {event.event} - {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                  <details>
                    <summary className="cursor-pointer text-gray-600">Payload</summary>
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connection Status */}
        <div className="text-xs text-gray-600">
          <div>Game ID: {gameId}</div>
          <div>Subscription: {subscription ? 'Active' : 'Inactive'}</div>
          <div>Supabase: {supabase ? 'Connected' : 'Not configured'}</div>
        </div>
      </div>
    </div>
  )
}
