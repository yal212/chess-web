// Real-time diagnostics utility
import { supabase } from '@/lib/supabase'

export interface DiagnosticResult {
  test: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

export async function runRealtimeDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = []

  // Test 1: Supabase client configuration
  if (!supabase) {
    results.push({
      test: 'Supabase Client',
      status: 'fail',
      message: 'Supabase client is not configured'
    })
    return results
  }

  results.push({
    test: 'Supabase Client',
    status: 'pass',
    message: 'Supabase client is configured'
  })

  // Test 2: Authentication
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      results.push({
        test: 'Authentication',
        status: 'fail',
        message: 'User is not authenticated',
        details: error
      })
    } else {
      results.push({
        test: 'Authentication',
        status: 'pass',
        message: `User authenticated: ${user.email}`,
        details: { userId: user.id }
      })
    }
  } catch (error) {
    results.push({
      test: 'Authentication',
      status: 'fail',
      message: 'Authentication check failed',
      details: error
    })
  }

  // Test 3: Database connectivity
  try {
    const { data, error } = await supabase
      .from('games')
      .select('count')
      .limit(1)

    if (error) {
      results.push({
        test: 'Database Connectivity',
        status: 'fail',
        message: 'Cannot connect to database',
        details: error
      })
    } else {
      results.push({
        test: 'Database Connectivity',
        status: 'pass',
        message: 'Database connection successful'
      })
    }
  } catch (error) {
    results.push({
      test: 'Database Connectivity',
      status: 'fail',
      message: 'Database connection failed',
      details: error
    })
  }

  // Test 4: Real-time channel creation
  try {
    const channel = supabase.channel('diagnostic-test')
    let channelStatus = 'unknown'
    
    const statusPromise = new Promise<string>((resolve) => {
      channel.subscribe((status) => {
        resolve(status)
      })
    })

    // Wait for status with timeout
    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('timeout'), 5000)
    })

    channelStatus = await Promise.race([statusPromise, timeoutPromise])
    
    channel.unsubscribe()

    if (channelStatus === 'SUBSCRIBED') {
      results.push({
        test: 'Real-time Channel',
        status: 'pass',
        message: 'Real-time channel subscription successful'
      })
    } else if (channelStatus === 'timeout') {
      results.push({
        test: 'Real-time Channel',
        status: 'fail',
        message: 'Real-time channel subscription timed out'
      })
    } else {
      results.push({
        test: 'Real-time Channel',
        status: 'warning',
        message: `Real-time channel status: ${channelStatus}`
      })
    }
  } catch (error) {
    results.push({
      test: 'Real-time Channel',
      status: 'fail',
      message: 'Real-time channel creation failed',
      details: error
    })
  }

  // Test 5: Games table access
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from('games')
        .select('id, status, white_player_id, black_player_id')
        .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
        .limit(1)

      if (error) {
        results.push({
          test: 'Games Table Access',
          status: 'fail',
          message: 'Cannot access games table',
          details: error
        })
      } else {
        results.push({
          test: 'Games Table Access',
          status: 'pass',
          message: `Games table accessible, found ${data.length} games`
        })
      }
    }
  } catch (error) {
    results.push({
      test: 'Games Table Access',
      status: 'fail',
      message: 'Games table access failed',
      details: error
    })
  }

  // Test 6: Real-time subscription with postgres_changes
  try {
    let eventReceived = false
    const channel = supabase.channel('postgres-test')
    
    channel.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'games'
    }, (payload) => {
      console.log('Diagnostic: postgres_changes event received:', payload)
      eventReceived = true
    })

    const subscriptionPromise = new Promise<string>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve('subscribed')
        } else if (status === 'CHANNEL_ERROR') {
          resolve('error')
        }
      })
    })

    const timeoutPromise = new Promise<string>((resolve) => {
      setTimeout(() => resolve('timeout'), 5000)
    })

    const result = await Promise.race([subscriptionPromise, timeoutPromise])
    
    channel.unsubscribe()

    if (result === 'subscribed') {
      results.push({
        test: 'Postgres Changes Subscription',
        status: 'pass',
        message: 'postgres_changes subscription successful'
      })
    } else if (result === 'timeout') {
      results.push({
        test: 'Postgres Changes Subscription',
        status: 'fail',
        message: 'postgres_changes subscription timed out'
      })
    } else {
      results.push({
        test: 'Postgres Changes Subscription',
        status: 'fail',
        message: `postgres_changes subscription failed: ${result}`
      })
    }
  } catch (error) {
    results.push({
      test: 'Postgres Changes Subscription',
      status: 'fail',
      message: 'postgres_changes subscription error',
      details: error
    })
  }

  return results
}

// Quick test to check if real-time is working at all
export async function quickRealtimeTest(): Promise<boolean> {
  if (!supabase) return false

  try {
    const channel = supabase.channel('quick-test')
    let connected = false

    const promise = new Promise<boolean>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          connected = true
          resolve(true)
        } else if (status === 'CHANNEL_ERROR') {
          resolve(false)
        }
      })

      // Timeout after 3 seconds
      setTimeout(() => {
        if (!connected) resolve(false)
      }, 3000)
    })

    const result = await promise
    channel.unsubscribe()
    return result
  } catch (error) {
    console.error('Quick real-time test failed:', error)
    return false
  }
}
