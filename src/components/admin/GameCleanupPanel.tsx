'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Trash2, RefreshCw, Clock, CheckCircle, AlertTriangle, Info } from 'lucide-react'

interface CleanupStats {
  waitingGames: number
  completedGames: number
  abandonedGames: number
  oldCompletedGames: number
}

interface CleanupResult {
  type: 'waiting' | 'completed' | 'abandoned' | 'old_completed' | 'comprehensive'
  count: number
  success: boolean
  message: string
}

export default function GameCleanupPanel() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<CleanupStats | null>(null)
  const [results, setResults] = useState<CleanupResult[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  const fetchCleanupStats = async () => {
    if (!supabase || !user) return

    try {
      setLoading(true)

      // Get waiting games count
      const { count: waitingCount } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'waiting')

      // Get completed games count
      const { count: completedCount } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')

      // Get abandoned games count
      const { count: abandonedCount } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'abandoned')

      // Get old completed games count (7+ days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      const { count: oldCompletedCount } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed')
        .lt('completed_at', sevenDaysAgo.toISOString())

      setStats({
        waitingGames: waitingCount || 0,
        completedGames: completedCount || 0,
        abandonedGames: abandonedCount || 0,
        oldCompletedGames: oldCompletedCount || 0
      })
    } catch (error) {
      console.error('Error fetching cleanup stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const cleanupWaitingGames = async () => {
    if (!supabase || !user) return

    try {
      const thirtyMinutesAgo = new Date()
      thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30)

      const { data, error } = await supabase
        .from('games')
        .update({ status: 'abandoned' })
        .eq('status', 'waiting')
        .lt('created_at', thirtyMinutesAgo.toISOString())
        .select('id')

      if (error) throw error

      return {
        type: 'waiting' as const,
        count: data?.length || 0,
        success: true,
        message: `Marked ${data?.length || 0} stale waiting games as abandoned`
      }
    } catch (error) {
      return {
        type: 'waiting' as const,
        count: 0,
        success: false,
        message: `Failed to cleanup waiting games: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const cleanupOldCompletedGames = async (daysOld: number = 7) => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .rpc('cleanup_old_completed_games', { days_old: daysOld })

      if (error) throw error

      return {
        type: 'old_completed' as const,
        count: data || 0,
        success: true,
        message: `Deleted ${data || 0} old completed games (${daysOld}+ days old)`
      }
    } catch (error) {
      return {
        type: 'old_completed' as const,
        count: 0,
        success: false,
        message: `Failed to cleanup old games: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const runComprehensiveCleanup = async () => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .rpc('comprehensive_cleanup', {
          stale_waiting_minutes: 30,
          old_completed_days: 7,
          old_abandoned_days: 1
        })

      if (error) throw error

      return {
        type: 'comprehensive' as const,
        count: data?.total_actions || 0,
        success: true,
        message: `Comprehensive cleanup completed: ${data?.stale_waiting_marked_abandoned || 0} waiting games marked abandoned, ${data?.old_completed_deleted || 0} old completed games deleted, ${data?.old_abandoned_deleted || 0} old abandoned games deleted`
      }
    } catch (error) {
      return {
        type: 'comprehensive' as const,
        count: 0,
        success: false,
        message: `Comprehensive cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const cleanupAbandonedGames = async (daysOld: number = 1) => {
    if (!supabase || !user) return

    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysOld)

      const { data, error } = await supabase
        .from('games')
        .delete()
        .eq('status', 'abandoned')
        .lt('created_at', cutoffDate.toISOString())
        .select('id')

      if (error) throw error

      return {
        type: 'abandoned' as const,
        count: data?.length || 0,
        success: true,
        message: `Deleted ${data?.length || 0} old abandoned games (${daysOld}+ days old)`
      }
    } catch (error) {
      return {
        type: 'abandoned' as const,
        count: 0,
        success: false,
        message: `Failed to cleanup abandoned games: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  const runFullCleanup = async () => {
    setLoading(true)
    setResults([])

    try {
      const cleanupResults: CleanupResult[] = []

      // Try comprehensive cleanup first (if available)
      const comprehensiveResult = await runComprehensiveCleanup()
      if (comprehensiveResult && comprehensiveResult.success) {
        cleanupResults.push(comprehensiveResult)
      } else {
        // Fallback to individual cleanups
        const waitingResult = await cleanupWaitingGames()
        if (waitingResult) cleanupResults.push(waitingResult)

        const completedResult = await cleanupOldCompletedGames(7)
        if (completedResult) cleanupResults.push(completedResult)

        const abandonedResult = await cleanupAbandonedGames(1)
        if (abandonedResult) cleanupResults.push(abandonedResult)
      }

      setResults(cleanupResults)

      // Refresh stats
      await fetchCleanupStats()
    } catch (error) {
      console.error('Error during cleanup:', error)
      setResults([{
        type: 'comprehensive',
        count: 0,
        success: false,
        message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }])
    } finally {
      setLoading(false)
    }
  }

  const getResultIcon = (result: CleanupResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    } else {
      return <AlertTriangle className="w-4 h-4 text-red-600" />
    }
  }

  const getResultColor = (result: CleanupResult) => {
    if (result.success) {
      return 'text-green-800 bg-green-50 border-green-200'
    } else {
      return 'text-red-800 bg-red-50 border-red-200'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Trash2 className="w-5 h-5 mr-2" />
          Game Cleanup
        </h3>
        <button
          onClick={fetchCleanupStats}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Stats Display */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.waitingGames}</div>
            <div className="text-sm text-blue-800">Waiting Games</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.completedGames}</div>
            <div className="text-sm text-green-800">Completed Games</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.abandonedGames}</div>
            <div className="text-sm text-yellow-800">Abandoned Games</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{stats.oldCompletedGames}</div>
            <div className="text-sm text-red-800">Old Completed (7+ days)</div>
          </div>
        </div>
      )}

      {/* Cleanup Actions */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={async () => {
              setLoading(true)
              setResults([])
              try {
                const result = await runComprehensiveCleanup()
                if (result) setResults([result])
                await fetchCleanupStats()
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Quick Cleanup
          </button>

          <button
            onClick={runFullCleanup}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Full Cleanup
          </button>
        </div>

        {/* Advanced Options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full text-sm text-gray-600 hover:text-gray-800"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="border-t pt-4 space-y-3">
            <div className="text-sm text-gray-600 flex items-start">
              <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Cleanup Rules:</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Waiting games older than 30 minutes → marked as abandoned</li>
                  <li>• Completed games older than 7 days (both players left) → deleted</li>
                  <li>• Abandoned games older than 1 day → deleted</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Display */}
      {results.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Cleanup Results:</h4>
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-3 rounded-md border text-sm flex items-start ${getResultColor(result)}`}
            >
              <div className="mr-2 mt-0.5">
                {getResultIcon(result)}
              </div>
              <div>
                <div className="font-medium">
                  {result.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Cleanup
                </div>
                <div>{result.message}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
