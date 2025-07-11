// Test script to verify real-time synchronization
import { supabase } from '@/lib/supabase'

export async function testRealtimeSync() {
  if (!supabase) {
    console.error('❌ Supabase not configured')
    return false
  }

  try {
    console.log('🔍 Testing real-time synchronization...')

    // First, let's check if we can connect to Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('games')
      .select('count')
      .limit(1)

    if (connectionError) {
      console.error('❌ Supabase connection failed:', connectionError)
      return false
    }

    console.log('✅ Supabase connection successful')

    // Check if real-time is enabled
    const channel = supabase.channel('test-realtime')
    
    let realtimeWorking = false
    
    // Set up a test subscription
    const subscription = channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games'
      }, (payload) => {
        console.log('📡 Real-time event received:', payload)
        realtimeWorking = true
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
      })

    // Wait for subscription to be established
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Get current user to create a proper test game
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ No authenticated user for test:', userError)
      subscription.unsubscribe()
      return false
    }

    // Try to create a test game to trigger real-time event
    const { data: newGame, error: createError } = await supabase
      .from('games')
      .insert({
        white_player_id: user.id,
        game_state: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        status: 'waiting'
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Failed to create test game:', createError)
      subscription.unsubscribe()
      return false
    }

    console.log('✅ Test game created:', newGame.id)

    // Wait for real-time event
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Clean up test game
    await supabase
      .from('games')
      .delete()
      .eq('id', newGame.id)

    subscription.unsubscribe()

    if (realtimeWorking) {
      console.log('✅ Real-time synchronization is working!')
      return true
    } else {
      console.log('❌ Real-time synchronization is not working')
      return false
    }

  } catch (error) {
    console.error('❌ Real-time sync test failed:', error)
    return false
  }
}

// Test move synchronization specifically
export async function testMoveSync(gameId: string) {
  if (!supabase) {
    console.error('❌ Supabase not configured')
    return false
  }

  try {
    console.log('🔍 Testing move synchronization for game:', gameId)

    let moveEventReceived = false
    
    // Set up subscription to monitor move changes
    const subscription = supabase
      .channel(`move-test-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${gameId}`
      }, (payload) => {
        console.log('📡 Move update received:', payload)
        
        // Check if this is a move update
        if (payload.new && payload.old) {
          const newMovesLength = payload.new.moves?.length || 0
          const oldMovesLength = payload.old.moves?.length || 0
          
          if (newMovesLength > oldMovesLength) {
            console.log('✅ Move detected in real-time!')
            moveEventReceived = true
          }
        }
      })
      .subscribe()

    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Get current game state
    const { data: currentGame, error: fetchError } = await supabase
      .from('games')
      .select('moves, game_state')
      .eq('id', gameId)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch game:', fetchError)
      subscription.unsubscribe()
      return false
    }

    // Add a test move
    const testMove = 'e4'
    const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const newMoves = [...(currentGame.moves || []), testMove]

    const { error: updateError } = await supabase
      .from('games')
      .update({
        moves: newMoves,
        game_state: testFen,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)

    if (updateError) {
      console.error('❌ Failed to update game:', updateError)
      subscription.unsubscribe()
      return false
    }

    console.log('✅ Move added to database')

    // Wait for real-time event
    await new Promise(resolve => setTimeout(resolve, 3000))

    subscription.unsubscribe()

    if (moveEventReceived) {
      console.log('✅ Move synchronization is working!')
      return true
    } else {
      console.log('❌ Move synchronization is not working')
      return false
    }

  } catch (error) {
    console.error('❌ Move sync test failed:', error)
    return false
  }
}

// Helper to check Supabase real-time configuration
export async function checkRealtimeConfig() {
  if (!supabase) {
    console.error('❌ Supabase not configured')
    return false
  }

  try {
    // Check if we can establish a basic channel
    const channel = supabase.channel('config-test')
    
    let connected = false
    
    channel.subscribe((status) => {
      console.log('📡 Channel status:', status)
      if (status === 'SUBSCRIBED') {
        connected = true
      }
    })

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000))

    channel.unsubscribe()

    if (connected) {
      console.log('✅ Real-time configuration is working')
      return true
    } else {
      console.log('❌ Real-time configuration has issues')
      return false
    }

  } catch (error) {
    console.error('❌ Real-time config check failed:', error)
    return false
  }
}
