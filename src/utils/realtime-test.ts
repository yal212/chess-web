// Real-time synchronization test utility
import { supabase } from '@/lib/supabase'

export interface RealtimeTestResult {
  success: boolean
  message: string
  details?: any
}

export class RealtimeTest {
  private gameId: string
  private subscription: any = null
  private receivedUpdates: any[] = []

  constructor(gameId: string) {
    this.gameId = gameId
  }

  // Test if real-time subscription is working
  async testSubscription(): Promise<RealtimeTestResult> {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client not configured'
      }
    }

    try {
      console.log('🔍 Testing real-time subscription for game:', this.gameId)

      // Set up subscription without filter first to test basic real-time
      this.subscription = supabase
        .channel(`test-game-${this.gameId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games'
          },
          (payload) => {
            console.log('📡 Real-time update received:', payload)
            this.receivedUpdates.push({
              timestamp: new Date().toISOString(),
              payload
            })
          }
        )
        .subscribe((status) => {
          console.log('📡 Subscription status:', status)
        })

      // Wait for subscription to be established
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        success: true,
        message: 'Real-time subscription established successfully',
        details: {
          channel: `test-game-${this.gameId}`,
          status: 'subscribed'
        }
      }
    } catch (error) {
      console.error('❌ Real-time subscription test failed:', error)
      return {
        success: false,
        message: `Real-time subscription failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      }
    }
  }

  // Test if database updates trigger real-time events
  async testDatabaseUpdate(): Promise<RealtimeTestResult> {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client not configured'
      }
    }

    try {
      console.log('🔍 Testing database update trigger for game:', this.gameId)

      const initialUpdateCount = this.receivedUpdates.length

      // Make a test update to the game
      const testUpdate = {
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('games')
        .update(testUpdate)
        .eq('id', this.gameId)

      if (error) {
        throw error
      }

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 2000))

      const newUpdateCount = this.receivedUpdates.length
      const receivedUpdate = newUpdateCount > initialUpdateCount

      return {
        success: receivedUpdate,
        message: receivedUpdate 
          ? 'Database update triggered real-time event successfully'
          : 'Database update did not trigger real-time event',
        details: {
          initialUpdates: initialUpdateCount,
          finalUpdates: newUpdateCount,
          receivedUpdates: this.receivedUpdates.slice(initialUpdateCount)
        }
      }
    } catch (error) {
      console.error('❌ Database update test failed:', error)
      return {
        success: false,
        message: `Database update test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      }
    }
  }

  // Test move synchronization specifically
  async testMoveSync(testMove: string, testFen: string): Promise<RealtimeTestResult> {
    if (!supabase) {
      return {
        success: false,
        message: 'Supabase client not configured'
      }
    }

    try {
      console.log('🔍 Testing move synchronization for game:', this.gameId)

      const initialUpdateCount = this.receivedUpdates.length

      // Get current game state
      const { data: currentGame, error: fetchError } = await supabase
        .from('games')
        .select('moves, game_state')
        .eq('id', this.gameId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      // Add test move
      const newMoves = [...(currentGame.moves || []), testMove]
      const { error: updateError } = await supabase
        .from('games')
        .update({
          moves: newMoves,
          game_state: testFen,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.gameId)

      if (updateError) {
        throw updateError
      }

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 2000))

      const newUpdateCount = this.receivedUpdates.length
      const receivedUpdate = newUpdateCount > initialUpdateCount

      // Check if the update contains move data
      const latestUpdate = this.receivedUpdates[this.receivedUpdates.length - 1]
      const moveDetected = latestUpdate?.payload?.new?.moves?.includes(testMove)

      return {
        success: receivedUpdate && moveDetected,
        message: receivedUpdate 
          ? (moveDetected ? 'Move synchronization working correctly' : 'Update received but move not detected')
          : 'Move update did not trigger real-time event',
        details: {
          initialUpdates: initialUpdateCount,
          finalUpdates: newUpdateCount,
          testMove,
          moveDetected,
          latestUpdate: latestUpdate?.payload
        }
      }
    } catch (error) {
      console.error('❌ Move sync test failed:', error)
      return {
        success: false,
        message: `Move sync test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error
      }
    }
  }

  // Clean up subscription
  cleanup() {
    if (this.subscription) {
      this.subscription.unsubscribe()
      this.subscription = null
    }
    this.receivedUpdates = []
  }

  // Get all received updates
  getReceivedUpdates() {
    return this.receivedUpdates
  }
}

// Helper function to run all tests
export async function runRealtimeTests(gameId: string): Promise<RealtimeTestResult[]> {
  const tester = new RealtimeTest(gameId)
  const results: RealtimeTestResult[] = []

  try {
    // Test 1: Subscription setup
    const subscriptionResult = await tester.testSubscription()
    results.push(subscriptionResult)

    if (!subscriptionResult.success) {
      return results
    }

    // Test 2: Database update trigger
    const updateResult = await tester.testDatabaseUpdate()
    results.push(updateResult)

    // Test 3: Move synchronization
    const moveResult = await tester.testMoveSync('e4', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')
    results.push(moveResult)

    return results
  } finally {
    tester.cleanup()
  }
}
