'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/layout/Navigation'
import ChessBoard from '@/components/chess/ChessBoard'
import ChatBox from '@/components/chess/ChatBox'
import { connectionManager } from '@/utils/realtime-connection-manager'
import { ArrowLeft, Users, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface GameData {
  id: string
  white_player_id: string
  black_player_id?: string
  game_state: string
  moves: string[]
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  winner?: 'white' | 'black' | 'draw'
  white_player: {
    display_name: string
    avatar_url?: string
  }
  black_player?: {
    display_name: string
    avatar_url?: string
  }
}

export default function GamePage() {
  const params = useParams()
  const gameId = params.id as string
  const { user } = useAuth()

  const [game, setGame] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track when the current user is making a move to prevent sync conflicts
  const [isUserMakingMove, setIsUserMakingMove] = useState(false)
  const userMoveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionRef = useRef<any>(null)
  const lastUpdateRef = useRef<string>('')
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const subscriptionRetryCount = useRef<number>(0)
  const [usePolling, setUsePolling] = useState(false)

  useEffect(() => {
    if (gameId && user) {
      fetchGame()

      // Set up connection monitoring
      const removeConnectionListener = connectionManager.addListener((status) => {
        if (!status.isConnected && !usePolling) {
          setUsePolling(true)
          startPolling()
        } else if (status.isConnected && usePolling && connectionManager.shouldUseRealtime()) {
          stopPolling()
          setUsePolling(false)

          // Re-establish subscription if needed
          if (!subscriptionRef.current) {
            const unsubscribe = subscribeToGameUpdates()
            subscriptionRef.current = unsubscribe
          }
        }
      })

      const unsubscribe = subscribeToGameUpdates()

      // Store unsubscribe function
      subscriptionRef.current = unsubscribe

      // Start polling as fallback after 10 seconds if real-time isn't working
      const fallbackTimer = setTimeout(() => {
        if (!usePolling && subscriptionRetryCount.current === 0 && !connectionManager.shouldUseRealtime()) {
          setUsePolling(true)
          startPolling()
        }
      }, 10000)

      return () => {
        clearTimeout(fallbackTimer)
        removeConnectionListener()
      }
    }

    // Cleanup timeout and subscription on unmount
    return () => {
      if (userMoveTimeoutRef.current) {
        clearTimeout(userMoveTimeoutRef.current)
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (subscriptionRef.current) {
        subscriptionRef.current()
      }
    }
  }, [gameId, user])

  const fetchGame = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          white_player:users!games_white_player_id_fkey(display_name, avatar_url),
          black_player:users!games_black_player_id_fkey(display_name, avatar_url)
        `)
        .eq('id', gameId)
        .single()

      if (error) throw error

      // Check if user is authorized to view this game
      if (data.white_player_id !== user?.id && data.black_player_id !== user?.id) {
        setError('You are not authorized to view this game')
        return
      }

      // Check if this is actually new data
      const dataHash = JSON.stringify({
        moves: data.moves,
        game_state: data.game_state,
        status: data.status,
        updated_at: data.updated_at
      })

      if (dataHash === lastUpdateRef.current) {
        console.log('🔄 No new data, skipping update')
        return
      }

      lastUpdateRef.current = dataHash
      console.log('✅ Game data updated:', {
        moves: data.moves?.length || 0,
        status: data.status,
        updated_at: data.updated_at
      })

      setGame(data)
    } catch (error) {
      console.error('Error fetching game:', error)
      setError('Game not found')
    } finally {
      setLoading(false)
    }
  }

  // Debounced fetch to prevent rapid successive calls
  const debouncedFetchGame = () => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    fetchTimeoutRef.current = setTimeout(() => {
      fetchGame()
    }, 100) // 100ms debounce
  }

  // Polling fallback for when real-time isn't working
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    const pollingInterval = connectionManager.getRecommendedPollingInterval()
    console.log(`🔄 Starting polling every ${pollingInterval}ms`)

    pollingIntervalRef.current = setInterval(() => {
      if (!isUserMakingMove) {
        console.log('🔄 Polling: fetching game state')
        fetchGame()
      }
    }, pollingInterval)
  }

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      console.log('🔄 Stopping polling')
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }



  // Handle subscription failures with retry logic
  const handleSubscriptionFailure = (reason: string) => {
    subscriptionRetryCount.current++

    if (subscriptionRetryCount.current <= 3) {
      console.log(`🔄 Retrying real-time subscription (attempt ${subscriptionRetryCount.current}/3) after ${reason}`)

      // Exponential backoff: 2s, 4s, 8s
      const retryDelay = 2000 * Math.pow(2, subscriptionRetryCount.current - 1)

      setTimeout(() => {
        try {
          // Clean up existing subscription
          if (subscriptionRef.current) {
            subscriptionRef.current()
          }

          // Create new subscription
          const newUnsubscribe = subscribeToGameUpdates()
          subscriptionRef.current = newUnsubscribe
        } catch (error) {
          console.error('❌ Failed to retry subscription:', error)
          setUsePolling(true)
          startPolling()
        }
      }, retryDelay)
    } else {
      console.log('🔄 Max retries reached, falling back to polling')
      setUsePolling(true)
      startPolling()
    }
  }

  const subscribeToGameUpdates = () => {
    if (!supabase) {
      console.warn('⚠️ Supabase not configured, skipping real-time subscription')
      return () => {}
    }

    console.log('📡 Setting up real-time subscription for game:', gameId)

    try {
      // Create a unique channel name with timestamp to avoid conflicts
      const channelName = `game-${gameId}-${Date.now()}`

      const subscription = supabase
        .channel(channelName, {
          config: {
            presence: {
              key: `user-${user?.id || 'anonymous'}`,
            },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'games',
            filter: `id=eq.${gameId}`
          },
          (payload) => {
            console.log('🔔 Real-time update received:', payload)
            console.log('🔔 Event type:', payload.eventType)
            console.log('🔔 User making move:', isUserMakingMove)

            // Real-time is working! Stop polling if it's running
            if (usePolling) {
              console.log('✅ Real-time working, stopping polling fallback')
              stopPolling()
              setUsePolling(false)
            }

            // If the current user is making a move, delay the refetch to avoid conflicts
            if (isUserMakingMove) {
              console.log('🔄 User is making move, delaying refetch...')
              setTimeout(() => {
                console.log('🔄 Delayed refetch after user move')
                debouncedFetchGame()
              }, 1500) // Increased delay for better stability
              return
            }

            // Handle different event types
            if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
              const newMovesLength = payload.new.moves?.length || 0
              const oldMovesLength = payload.old.moves?.length || 0

              console.log('🔄 Move count comparison:', {
                old: oldMovesLength,
                new: newMovesLength,
                newMoves: payload.new.moves,
                oldMoves: payload.old.moves
              })

              // If moves were added, this is a move update
              if (newMovesLength > oldMovesLength) {
                console.log('🔄 Move detected, refetching game state...')
                debouncedFetchGame()
              } else if (payload.new.game_state !== payload.old.game_state) {
                // Game state changed (could be a move without move array update)
                console.log('🔄 Game state changed, refetching...')
                debouncedFetchGame()
              } else if (payload.new.status !== payload.old.status) {
                // Status change (game started, ended, etc.)
                console.log('🔄 Status change detected, refetching...')
                debouncedFetchGame()
              } else {
                console.log('🔄 Other update detected, refetching...')
                debouncedFetchGame()
              }
            } else if (payload.eventType === 'INSERT') {
              // New game created
              console.log('🔄 New game created, refetching...')
              debouncedFetchGame()
            } else {
              // Other changes
              console.log('🔄 Other real-time event, refetching...')
              debouncedFetchGame()
            }
          }
        )
        .subscribe((status, err) => {
          console.log('📡 Subscription status:', status, err ? `Error: ${err}` : '')

          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to real-time updates')
            // Reset any retry attempts
            subscriptionRetryCount.current = 0
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Real-time subscription error - attempting retry or falling back to polling', err)
            handleSubscriptionFailure('CHANNEL_ERROR')
          } else if (status === 'TIMED_OUT') {
            console.error('❌ Real-time subscription timed out - attempting retry or falling back to polling')
            handleSubscriptionFailure('TIMED_OUT')
          } else if (status === 'CLOSED') {
            console.log('📡 Real-time subscription closed')
            // Only retry if this wasn't an intentional close
            if (subscriptionRetryCount.current < 3) {
              console.log('🔄 Attempting to reconnect real-time subscription...')
              setTimeout(() => {
                subscriptionRetryCount.current++
                const newUnsubscribe = subscribeToGameUpdates()
                subscriptionRef.current = newUnsubscribe
              }, 2000 * subscriptionRetryCount.current) // Exponential backoff
            } else {
              console.log('🔄 Max retries reached, falling back to polling')
              setUsePolling(true)
              startPolling()
            }
          }
        })

      return () => {
        console.log('📡 Unsubscribing from real-time updates')
        try {
          subscription.unsubscribe()
        } catch (error) {
          console.warn('⚠️ Error unsubscribing:', error)
        }
      }
    } catch (error) {
      console.error('❌ Failed to create real-time subscription:', error)
      // Fall back to polling immediately
      setUsePolling(true)
      startPolling()
      return () => {}
    }
  }

  const handleMove = async (move: any) => {
    console.log('🎯 handleMove called with:', move)
    console.log('🔍 Move object type:', typeof move)
    console.log('🔍 Move object keys:', move ? Object.keys(move) : 'move is null/undefined')

    if (!move) {
      console.error('❌ Move object is null or undefined')
      return
    }

    if (!game || !user) {
      console.log('❌ Missing game or user:', { game: !!game, user: !!user })
      return
    }

    // Set flag to indicate user is making a move
    setIsUserMakingMove(true)

    // Clear any existing timeout
    if (userMoveTimeoutRef.current) {
      clearTimeout(userMoveTimeoutRef.current)
    }

    console.log('🎮 Game state:', {
      status: game.status,
      white_player: game.white_player_id,
      black_player: game.black_player_id,
      moves_count: game.moves.length,
      current_turn: game.game_state.split(' ')[1] === 'w' ? 'White' : 'Black'
    })

    console.log('👤 User info:', {
      id: user.id,
      is_white: game.white_player_id === user.id,
      is_black: game.black_player_id === user.id
    })

    // Validate it's the player's turn
    if (!isPlayerTurn()) {
      console.log('❌ Not your turn!')
      alert('It\'s not your turn!')
      return
    }

    // Validate the game is active and has both players
    if (game.status !== 'active' || !game.black_player_id) {
      console.log('❌ Game is not active or missing players', {
        status: game.status,
        blackPlayerId: game.black_player_id,
        hasBlackPlayer: !!game.black_player_id
      })
      alert('Game is not active or waiting for another player')
      return
    }

    // Validate the user is actually a player in this game
    if (game.white_player_id !== user.id && game.black_player_id !== user.id) {
      console.log('❌ User is not a player in this game')
      alert('You are not a player in this game')
      return
    }

    try {
      console.log('🔄 Attempting to update game...')

      // Extract move data safely - the move object should have the FEN after the move
      const moveSan = move.san || move.move || `${move.from}-${move.to}`
      const moveAfter = move.after || move.fen

      if (!moveAfter) {
        console.error('❌ No FEN position after move')
        alert('Invalid move: no position data')
        return
      }

      if (!moveSan || moveSan === 'undefined-undefined') {
        console.error('❌ Invalid move SAN notation:', moveSan)
        alert('Invalid move: bad notation')
        return
      }

      console.log('📝 Move data:', { moveSan, moveAfter })
      console.log('📝 Current game moves:', game.moves)
      console.log('📝 Full move object:', move)

      // Update game state in database
      const newMoves = [...game.moves, moveSan]

      console.log('📝 Updating database with:', {
        game_state: moveAfter,
        moves: newMoves,
        movesLength: newMoves.length
      })

      const { error } = await supabase
        .from('games')
        .update({
          game_state: moveAfter, // FEN after the move
          moves: newMoves,
          updated_at: new Date().toISOString()
        })
        .eq('id', gameId)

      if (error) {
        console.error('❌ Game update error:', error)
        throw error
      }

      console.log('✅ Game updated successfully in database')
      console.log('✅ New moves array:', newMoves)

      // Also record the move in game_moves table
      console.log('🔄 Attempting to record move...')
      const { error: moveError } = await supabase
        .from('game_moves')
        .insert({
          game_id: gameId,
          player_id: user.id,
          move: moveSan,
          fen_after: moveAfter,
          move_number: newMoves.length
        })

      if (moveError) {
        console.error('❌ Move recording error:', moveError)
      } else {
        console.log('✅ Move recorded successfully')
      }

    } catch (error) {
      console.error('❌ Error in handleMove:', error)
      alert(`Failed to make move: ${error.message}`)
    } finally {
      // Clear the user making move flag after a delay to allow for sync
      userMoveTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Clearing user making move flag')
        setIsUserMakingMove(false)
      }, 3000) // Wait 3 seconds for the move to be fully processed and synced
    }
  }

  const getPlayerColor = (): 'white' | 'black' => {
    if (!game || !user) return 'white'

    // Fix: Explicitly check if user is black player first
    if (game.black_player_id === user.id) {
      console.log('🎯 Player identified as BLACK')
      return 'black'
    } else if (game.white_player_id === user.id) {
      console.log('🎯 Player identified as WHITE')
      return 'white'
    } else {
      // Fallback (spectator)
      console.log('🎯 Player identified as spectator, defaulting to WHITE view')
      return 'white'
    }
  }

  const isPlayerTurn = (): boolean => {
    if (!game || !user) return false

    // Parse FEN to get current turn
    const fenParts = game.game_state.split(' ')
    const currentTurn = fenParts[1] // 'w' for white, 'b' for black

    const playerColor = getPlayerColor()
    const isMyTurn = (currentTurn === 'w' && playerColor === 'white') ||
                     (currentTurn === 'b' && playerColor === 'black')

    console.log('🎯 Turn validation:', {
      currentTurn,
      playerColor,
      isMyTurn,
      fenParts,
      userId: user.id,
      whitePlayerId: game.white_player_id,
      blackPlayerId: game.black_player_id
    })

    return isMyTurn
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading game...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error || 'Game not found'}
            </h1>
            <Link
              href="/play"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/play"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Games
              </Link>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Chess Game
              </h1>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-gray-500">Game Status</div>
              <div className={`text-lg font-semibold capitalize ${
                game.status === 'active' ? 'text-green-600' :
                game.status === 'waiting' ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {game.status}
              </div>

            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Players Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* White Player */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-3">
                {game.white_player.avatar_url ? (
                  <img
                    src={game.white_player.avatar_url}
                    alt={game.white_player.display_name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    {game.white_player.display_name}
                  </div>
                  <div className="text-sm text-gray-500">White</div>
                </div>
              </div>
            </div>

            {/* Black Player */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-3">
                {game.black_player?.avatar_url ? (
                  <img
                    src={game.black_player.avatar_url}
                    alt={game.black_player.display_name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-gray-600" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900">
                    {game.black_player?.display_name || 'Waiting for player...'}
                  </div>
                  <div className="text-sm text-gray-500">Black</div>
                </div>
              </div>
            </div>

            {/* Chat */}
            <ChatBox gameId={gameId} className="h-96" />
          </div>

          {/* Chess Board */}
          <div className="lg:col-span-3 flex justify-center">
            <ChessBoard
              gameId={gameId}
              playerColor={getPlayerColor()}
              isSpectator={game.status === 'completed' || game.status === 'abandoned'}
              onMove={handleMove}
              initialFen={game.game_state}
              currentFen={game.game_state}
              moves={game.moves}
              isPlayerTurn={game.status === 'active' ? isPlayerTurn() : false}
            />

          </div>
        </div>
      </div>


    </div>
  )
}
