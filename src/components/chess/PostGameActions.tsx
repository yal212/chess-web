'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type PostGameAction } from '@/lib/supabase'
import { Crown, RotateCcw, LogOut, Clock, Users } from 'lucide-react'

interface PostGameActionsProps {
  gameId: string
  winner?: 'white' | 'black' | 'draw'
  resultReason?: string
  playerColor: 'white' | 'black'
  whitePlayerName: string
  blackPlayerName: string
  onPlayAgain?: (newGameId: string) => void
  onLeave?: () => void
}

export default function PostGameActions({
  gameId,
  winner,
  resultReason,
  playerColor,
  whitePlayerName,
  blackPlayerName,
  onPlayAgain,
  onLeave
}: PostGameActionsProps) {
  const { user } = useAuth()
  const [actions, setActions] = useState<PostGameAction[]>([])
  const [userAction, setUserAction] = useState<'play_again' | 'leave' | null>(null)
  const [loading, setLoading] = useState(false)
  const [creatingGame, setCreatingGame] = useState(false)
  const [databaseError, setDatabaseError] = useState(false)
  const [realtimeError, setRealtimeError] = useState(false)

  // Fetch existing post-game actions
  useEffect(() => {
    if (gameId) {
      fetchPostGameActions()

      // Set up subscription with error handling
      const unsubscribe = subscribeToActions()

      // Cleanup function
      return () => {
        if (unsubscribe) {
          unsubscribe()
        }
      }
    }
  }, [gameId])

  const fetchPostGameActions = async () => {
    if (!supabase || !user) return

    try {
      console.log('Fetching post-game actions for game:', gameId)

      const { data, error } = await supabase
        .from('post_game_actions')
        .select('*')
        .eq('game_id', gameId)

      if (error) {
        console.error('Error fetching post-game actions:', error)
        // If the table doesn't exist, that's expected for games before migration
        if (error.code === '42P01') {
          console.log('Post-game actions table not found - this is expected for older games')
          return
        }
        return
      }

      console.log('Fetched post-game actions:', data)
      setActions(data || [])

      // Set user's current action if any
      const userActionRecord = data?.find(action => action.player_id === user?.id)
      if (userActionRecord) {
        setUserAction(userActionRecord.action)
        console.log('User current action:', userActionRecord.action)
      }
    } catch (error) {
      console.error('Error in fetchPostGameActions:', error)
    }
  }

  const subscribeToActions = () => {
    if (!supabase) {
      console.warn('Supabase not configured, using polling fallback')
      return setupPollingFallback()
    }

    try {
      const channelName = `post-game-actions-${gameId}-${Date.now()}`
      console.log('Setting up post-game actions subscription:', channelName)

      let subscription: any = null
      let pollingInterval: NodeJS.Timeout | null = null
      let subscriptionFailed = false

      // Set up polling fallback in case real-time fails
      const setupPolling = () => {
        if (pollingInterval) return

        console.log('Setting up polling fallback for post-game actions')
        pollingInterval = setInterval(async () => {
          try {
            await fetchPostGameActions()
            checkForNewGame()
          } catch (error) {
            console.error('Polling error:', error)
          }
        }, 2000) // Poll every 2 seconds
      }

      subscription = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'post_game_actions',
          filter: `game_id=eq.${gameId}`
        }, (payload) => {
          console.log('Post-game action update:', payload)
          // Real-time is working, clear polling if it was set up
          if (pollingInterval) {
            clearInterval(pollingInterval)
            pollingInterval = null
          }

          // Add a small delay to avoid race conditions
          setTimeout(async () => {
            await fetchPostGameActions()
            checkForNewGame()
          }, 500)
        })
        .subscribe((status, err) => {
          console.log('Post-game actions subscription status:', status)

          if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Post-game actions subscription error:', err || status)
            subscriptionFailed = true
            setupPolling()
          } else if (status === 'SUBSCRIBED') {
            console.log('Post-game actions real-time connected')
            subscriptionFailed = false
            // Clear polling since real-time is working
            if (pollingInterval) {
              clearInterval(pollingInterval)
              pollingInterval = null
            }
          }
        })

      // Set up polling after a delay if subscription doesn't work
      setTimeout(() => {
        if (subscriptionFailed || !subscription) {
          setupPolling()
        }
      }, 5000)

      return () => {
        try {
          if (subscription) {
            subscription.unsubscribe()
          }
          if (pollingInterval) {
            clearInterval(pollingInterval)
          }
        } catch (error) {
          console.warn('Error cleaning up post-game actions subscription:', error)
        }
      }
    } catch (error) {
      console.error('Error setting up post-game actions subscription:', error)
      return setupPollingFallback()
    }
  }

  const setupPollingFallback = () => {
    console.log('Using polling fallback for post-game actions')
    const pollingInterval = setInterval(async () => {
      try {
        await fetchPostGameActions()
        checkForNewGame()
      } catch (error) {
        console.error('Polling fallback error:', error)
      }
    }, 3000) // Poll every 3 seconds

    return () => {
      clearInterval(pollingInterval)
    }
  }

  const handleAction = async (action: 'play_again' | 'leave') => {
    if (!user || !supabase) return

    setLoading(true)
    try {
      console.log('=== POST-GAME ACTION DEBUG ===')
      console.log('Saving post-game action:', { gameId, playerId: user.id, action })
      console.log('User object:', user)
      console.log('Supabase client:', !!supabase)

      // First check if the post_game_actions table exists and is accessible
      console.log('Testing table accessibility...')
      const { data: testData, error: testError } = await supabase
        .from('post_game_actions')
        .select('count', { count: 'exact', head: true })

      if (testError) {
        console.error('Post-game actions table not accessible:', {
          code: testError.code,
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
          fullError: testError
        })
        setDatabaseError(true)
        alert('Database setup incomplete. Please run the post-game migration script. See TROUBLESHOOTING_POST_GAME_ERRORS.md for help.')
        return
      }

      console.log('Table accessibility test passed:', testData)

      // Debug: Check the current game status
      console.log('Checking current game status...')
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('id, status, winner, white_player_id, black_player_id, result_reason, completed_at')
        .eq('id', gameId)
        .single()

      console.log('Current game data:', gameData)
      console.log('Game error (if any):', gameError)

      // Debug: Check current auth user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      console.log('Current auth user:', authUser?.id)
      console.log('User from context:', user?.id)
      console.log('Auth user matches context:', authUser?.id === user?.id)

      // Check if user already has an action for this game
      console.log('Checking for existing user action...')
      const { data: existingAction, error: checkError } = await supabase
        .from('post_game_actions')
        .select('*')
        .eq('game_id', gameId)
        .eq('player_id', user.id)
        .single()

      console.log('Existing action check:', { existingAction, checkError })

      if (existingAction) {
        console.log('User already has an action, updating it...')
        const { data: updateData, error: updateError } = await supabase
          .from('post_game_actions')
          .update({
            action,
            created_at: new Date().toISOString()
          })
          .eq('game_id', gameId)
          .eq('player_id', user.id)
          .select()

        if (updateError) {
          console.error('Error updating existing post-game action:', {
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            fullError: updateError
          })
          throw updateError
        }

        console.log('Successfully updated existing action:', updateData)
      } else {
        // Try to insert new action
        console.log('Attempting to insert post-game action...')
        const insertData = {
          game_id: gameId,
          player_id: user.id,
          action
        }
        console.log('Insert data:', insertData)

        const { data, error: insertError } = await supabase
          .from('post_game_actions')
          .insert(insertData)
          .select()

        console.log('Insert result:', { data, insertError })

        if (insertError) {
          console.log('Insert failed, checking error type...')
          console.log('Error code:', insertError.code)
          console.log('Error message:', insertError.message)

          // If it's a unique constraint violation, try to update instead
          if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
            console.log('Unique constraint violation detected, updating existing record...')
            const { data: updateData, error: updateError } = await supabase
              .from('post_game_actions')
              .update({
                action,
                created_at: new Date().toISOString() // Update timestamp too
              })
              .eq('game_id', gameId)
              .eq('player_id', user.id)
              .select()

            console.log('Update result:', { updateData, updateError })

            if (updateError) {
              console.error('Error updating post-game action:', {
                code: updateError.code,
                message: updateError.message,
                details: updateError.details,
                hint: updateError.hint,
                fullError: updateError
              })
              throw updateError
            }

            console.log('Successfully updated existing post-game action')
          } else {
            console.error('Error inserting post-game action:', {
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
              fullError: insertError
            })
            throw insertError
          }
        } else {
          console.log('Successfully inserted new post-game action:', data)
        }
      }

      console.log('Post-game action saved successfully')
      setUserAction(action)

      // If both players want to play again, create a new game
      if (action === 'play_again') {
        checkForNewGame()
      } else if (action === 'leave' && onLeave) {
        onLeave()
      }
    } catch (error: any) {
      console.error('Error in handleAction:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        fullError: error
      })

      let errorMessage = 'Unknown error'
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.code) {
        errorMessage = `Database error (${error.code})`
      }

      alert(`Failed to ${action.replace('_', ' ')}: ${errorMessage}. Check console for details.`)
    } finally {
      setLoading(false)
    }
  }

  const checkForNewGame = async () => {
    if (!supabase) return

    console.log('Checking for new game creation...')
    console.log('Current actions:', actions)
    console.log('User action:', userAction)

    // Get fresh data to make sure we have the latest actions
    const { data: currentActions, error } = await supabase
      .from('post_game_actions')
      .select('*')
      .eq('game_id', gameId)
      .eq('action', 'play_again')

    if (error) {
      console.error('Error fetching current actions:', error)
      return
    }

    console.log('Current play again actions:', currentActions)

    if (currentActions && currentActions.length === 2) {
      console.log('Both players want to play again! Creating new game...')
      createNewGame()
    } else {
      console.log(`Only ${currentActions?.length || 0} player(s) want to play again. Waiting for both...`)
    }
  }

  const createNewGame = async () => {
    if (!user || !supabase || creatingGame) return

    setCreatingGame(true)
    try {
      console.log('Creating new game...')
      console.log('Current player color:', playerColor)
      console.log('Current user ID:', user.id)

      // Get the current game data to find both players
      const { data: currentGame, error: gameError } = await supabase
        .from('games')
        .select('white_player_id, black_player_id')
        .eq('id', gameId)
        .single()

      if (gameError || !currentGame) {
        console.error('Error fetching current game:', gameError)
        throw new Error('Could not fetch current game data')
      }

      console.log('Current game players:', currentGame)

      // Determine the other player
      const otherPlayerId = currentGame.white_player_id === user.id
        ? currentGame.black_player_id
        : currentGame.white_player_id

      if (!otherPlayerId) {
        throw new Error('Could not determine other player')
      }

      // Swap colors: if current user was white, they become black in new game
      const newWhitePlayerId = playerColor === 'white' ? otherPlayerId : user.id
      const newBlackPlayerId = playerColor === 'white' ? user.id : otherPlayerId

      console.log('New game setup:', {
        newWhitePlayerId,
        newBlackPlayerId,
        colorSwap: `${playerColor} -> ${playerColor === 'white' ? 'black' : 'white'}`
      })

      // Create a new game with swapped colors
      const { data: newGame, error } = await supabase
        .from('games')
        .insert({
          white_player_id: newWhitePlayerId,
          black_player_id: newBlackPlayerId,
          status: 'active'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating new game:', error)
        throw error
      }

      console.log('New game created successfully:', newGame.id)

      // Clear the post-game actions for the old game since we're starting fresh
      await supabase
        .from('post_game_actions')
        .delete()
        .eq('game_id', gameId)

      if (onPlayAgain) {
        onPlayAgain(newGame.id)
      } else {
        // Navigate to the new game
        window.location.href = `/game/${newGame.id}`
      }
    } catch (error: any) {
      console.error('Error creating new game:', error)
      alert(`Failed to create new game: ${error.message || 'Unknown error'}`)
    } finally {
      setCreatingGame(false)
    }
  }

  const getResultMessage = () => {
    if (!winner) return 'Game completed'
    
    if (winner === 'draw') {
      return 'Game ended in a draw'
    }
    
    const winnerName = winner === 'white' ? whitePlayerName : blackPlayerName
    const reasonText = resultReason ? ` by ${resultReason.replace('_', ' ')}` : ''
    
    return `${winnerName} wins${reasonText}!`
  }

  const getOtherPlayerAction = () => {
    if (!user) return null
    return actions.find(action => action.player_id !== user.id)
  }

  const otherPlayerAction = getOtherPlayerAction()
  const bothWantPlayAgain = actions.filter(a => a.action === 'play_again').length === 2

  // Fallback UI if database setup is incomplete
  if (databaseError) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Crown className="h-8 w-8 text-yellow-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Game Over</h3>
          <p className="text-gray-600 text-lg">{getResultMessage()}</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              if (onPlayAgain) {
                // Create a simple new game without database tracking
                createNewGame()
              }
            }}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            New Game
          </button>

          <button
            onClick={() => {
              if (onLeave) {
                onLeave()
              }
            }}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Back to Games
          </button>
        </div>

        <div className="mt-4 p-3 bg-orange-50 rounded-lg">
          <p className="text-orange-700 text-sm">
            Database setup incomplete. Check the troubleshooting guide for help.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 max-w-md mx-auto">
      {/* Game Result */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Crown className="h-8 w-8 text-yellow-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Game Over</h3>
        <p className="text-gray-600 text-lg">{getResultMessage()}</p>
      </div>

      {/* Player Actions Status */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Your choice:</span>
          <span className={`font-medium ${
            userAction === 'play_again' ? 'text-green-600' : 
            userAction === 'leave' ? 'text-red-600' : 'text-gray-400'
          }`}>
            {userAction ? userAction.replace('_', ' ') : 'Waiting...'}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Opponent:</span>
          <span className={`font-medium ${
            otherPlayerAction?.action === 'play_again' ? 'text-green-600' : 
            otherPlayerAction?.action === 'leave' ? 'text-red-600' : 'text-gray-400'
          }`}>
            {otherPlayerAction ? otherPlayerAction.action.replace('_', ' ') : 'Waiting...'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      {!userAction && (
        <div className="space-y-3">
          <button
            onClick={() => handleAction('play_again')}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            {loading ? 'Processing...' : 'Play Again'}
          </button>
          
          <button
            onClick={() => handleAction('leave')}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <LogOut className="h-5 w-5 mr-2" />
            {loading ? 'Processing...' : 'Leave Game'}
          </button>
        </div>
      )}

      {/* Status Messages */}
      {userAction === 'play_again' && !bothWantPlayAgain && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center text-blue-700">
            <Clock className="h-5 w-5 mr-2" />
            <span className="text-sm">Waiting for opponent to accept...</span>
          </div>
        </div>
      )}

      {bothWantPlayAgain && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <div className="flex items-center text-green-700">
            <Users className="h-5 w-5 mr-2" />
            <span className="text-sm">
              {creatingGame ? 'Creating new game with swapped colors...' : 'Both players ready! Starting new game...'}
            </span>
          </div>
          {creatingGame && (
            <div className="mt-2 text-xs text-green-600">
              Colors will be swapped: {playerColor === 'white' ? 'You will play as Black' : 'You will play as White'}
            </div>
          )}
        </div>
      )}

      {userAction === 'leave' && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center text-gray-700">
            <LogOut className="h-5 w-5 mr-2" />
            <span className="text-sm">You have left the game.</span>
          </div>
        </div>
      )}
    </div>
  )
}
