'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/layout/Navigation'
import ChessBoard from '@/components/chess/ChessBoard'
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

  useEffect(() => {
    if (gameId && user) {
      fetchGame()
      subscribeToGameUpdates()
    }

    // Cleanup timeout on unmount
    return () => {
      if (userMoveTimeoutRef.current) {
        clearTimeout(userMoveTimeoutRef.current)
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

      setGame(data)
    } catch (error) {
      console.error('Error fetching game:', error)
      setError('Game not found')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToGameUpdates = () => {
    const subscription = supabase
      .channel(`game-${gameId}`)
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

          // If the current user is making a move, delay the refetch to avoid conflicts
          if (isUserMakingMove) {
            console.log('🔄 User is making move, delaying refetch...')
            setTimeout(() => {
              console.log('🔄 Delayed refetch after user move')
              fetchGame()
            }, 1000) // Wait 1 second for local state to settle
            return
          }

          // Only refetch if this update wasn't made by the current user
          // This prevents unnecessary refetches when the user makes their own move
          if (payload.new && payload.old) {
            const newMovesLength = payload.new.moves?.length || 0
            const oldMovesLength = payload.old.moves?.length || 0

            // If moves were added, this is a move update
            if (newMovesLength > oldMovesLength) {
              console.log('🔄 Move detected, refetching game state...')
              fetchGame()
            } else {
              // Other updates (status changes, player joins, etc.)
              console.log('🔄 Non-move update, refetching...')
              fetchGame()
            }
          } else {
            // New game or other changes
            console.log('🔄 New game or other changes, refetching...')
            fetchGame()
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
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
      console.log('❌ Game is not active or missing players')
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

      console.log('📝 Move data:', { moveSan, moveAfter })

      // Update game state in database
      const newMoves = [...game.moves, moveSan]
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

      console.log('✅ Game updated successfully')

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
      }, 2000) // Wait 2 seconds for the move to be fully processed
    }
  }

  const getPlayerColor = (): 'white' | 'black' => {
    if (!game || !user) return 'white'
    return game.white_player_id === user.id ? 'white' : 'black'
  }

  const isPlayerTurn = (): boolean => {
    if (!game || !user) return false
    
    // Parse FEN to get current turn
    const fenParts = game.game_state.split(' ')
    const currentTurn = fenParts[1] // 'w' for white, 'b' for black
    
    const playerColor = getPlayerColor()
    return (currentTurn === 'w' && playerColor === 'white') || 
           (currentTurn === 'b' && playerColor === 'black')
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

            {/* Chat placeholder */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center space-x-2 mb-3">
                <MessageCircle className="h-5 w-5 text-gray-400" />
                <span className="font-medium text-gray-900">Chat</span>
              </div>
              <div className="text-sm text-gray-500 text-center py-4">
                Chat feature coming soon!
              </div>
            </div>
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
