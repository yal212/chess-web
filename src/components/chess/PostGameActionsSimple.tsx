'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, type PostGameAction } from '@/lib/supabase'
import { Crown, RotateCcw, LogOut, Clock, Users } from 'lucide-react'

interface PostGameActionsSimpleProps {
  gameId: string
  winner?: 'white' | 'black' | 'draw'
  resultReason?: string
  playerColor: 'white' | 'black'
  whitePlayerName: string
  blackPlayerName: string
  onPlayAgain?: (newGameId: string) => void
  onLeave?: () => void
}

export default function PostGameActionsSimple({
  gameId,
  winner,
  resultReason,
  playerColor,
  whitePlayerName,
  blackPlayerName,
  onPlayAgain,
  onLeave
}: PostGameActionsSimpleProps) {
  const { user } = useAuth()
  const [actions, setActions] = useState<PostGameAction[]>([])
  const [userAction, setUserAction] = useState<'play_again' | 'leave' | null>(null)
  const [loading, setLoading] = useState(false)
  const [creatingGame, setCreatingGame] = useState(false)

  // Simple polling approach - more reliable than real-time subscriptions
  useEffect(() => {
    if (gameId && user) {
      fetchPostGameActions()
      
      // Poll for updates every 2 seconds
      const interval = setInterval(() => {
        fetchPostGameActions()
      }, 2000)

      return () => clearInterval(interval)
    }
  }, [gameId, user])

  const fetchPostGameActions = async () => {
    if (!supabase || !user) return

    try {
      const { data, error } = await supabase
        .from('post_game_actions')
        .select('*')
        .eq('game_id', gameId)

      if (error) {
        console.error('Error fetching post-game actions:', error)
        return
      }

      setActions(data || [])
      
      // Set user's current action if any
      const userActionRecord = data?.find(action => action.player_id === user?.id)
      if (userActionRecord) {
        setUserAction(userActionRecord.action)
      }

      // Check if both players want to play again
      const playAgainActions = data?.filter(action => action.action === 'play_again') || []
      if (playAgainActions.length === 2 && !creatingGame) {
        console.log('Both players want to play again!')
        createNewGame()
      }
    } catch (error) {
      console.error('Error in fetchPostGameActions:', error)
    }
  }

  const handleAction = async (action: 'play_again' | 'leave') => {
    if (!user || !supabase) return

    setLoading(true)
    try {
      // Simple upsert approach
      const { error } = await supabase
        .from('post_game_actions')
        .upsert({
          game_id: gameId,
          player_id: user.id,
          action
        }, {
          onConflict: 'game_id,player_id'
        })

      if (error) {
        console.error('Error saving post-game action:', error)
        throw error
      }

      setUserAction(action)

      // If user chose leave, handle it immediately
      if (action === 'leave' && onLeave) {
        onLeave()
      }

      // Refresh actions to check for both players
      setTimeout(() => {
        fetchPostGameActions()
      }, 500)
    } catch (error: any) {
      console.error('Error in handleAction:', error)
      alert(`Failed to ${action.replace('_', ' ')}: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const createNewGame = async () => {
    if (!user || !supabase || creatingGame) return

    setCreatingGame(true)
    try {
      console.log('Creating new game and deleting old one...')

      // Get the current game data to find both players
      const { data: currentGame, error: gameError } = await supabase
        .from('games')
        .select('white_player_id, black_player_id')
        .eq('id', gameId)
        .single()

      if (gameError || !currentGame) {
        throw new Error('Could not fetch current game data')
      }

      // Determine the other player
      const otherPlayerId = currentGame.white_player_id === user.id
        ? currentGame.black_player_id
        : currentGame.white_player_id

      if (!otherPlayerId) {
        throw new Error('Could not determine other player')
      }

      // Swap colors for the new game
      const newWhitePlayerId = playerColor === 'white' ? otherPlayerId : user.id
      const newBlackPlayerId = playerColor === 'white' ? user.id : otherPlayerId

      console.log('Creating new game with swapped colors:', {
        oldWhite: currentGame.white_player_id,
        oldBlack: currentGame.black_player_id,
        newWhite: newWhitePlayerId,
        newBlack: newBlackPlayerId
      })

      // Create a new game with swapped colors
      const { data: newGame, error: createError } = await supabase
        .from('games')
        .insert({
          white_player_id: newWhitePlayerId,
          black_player_id: newBlackPlayerId,
          status: 'active'
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      console.log('New game created successfully:', newGame.id)

      // Delete the old completed game (this will cascade delete related records)
      console.log('Deleting old game:', gameId)
      const { error: deleteError } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId)

      if (deleteError) {
        console.error('Error deleting old game:', deleteError)
        // Don't throw here - the new game was created successfully
        // The old game can be cleaned up later
      } else {
        console.log('Old game deleted successfully')
      }

      // Navigate to the new game
      if (onPlayAgain) {
        onPlayAgain(newGame.id)
      } else {
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
