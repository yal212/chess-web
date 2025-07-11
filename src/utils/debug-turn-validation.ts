// Debug utility for turn validation issues
import { supabase } from '@/lib/supabase'

export interface TurnDebugInfo {
  gameId: string
  userId: string
  gameState: string
  whitePlayerId: string
  blackPlayerId: string | null
  gameStatus: string
  currentTurn: string
  playerColor: 'white' | 'black'
  isPlayerTurn: boolean
  canMove: boolean
}

export async function debugTurnValidation(gameId: string): Promise<TurnDebugInfo | null> {
  if (!supabase) {
    console.error('Supabase not configured')
    return null
  }

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('No authenticated user:', userError)
      return null
    }

    // Get game data
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (gameError || !game) {
      console.error('Game not found:', gameError)
      return null
    }

    // Parse FEN to get current turn
    const fenParts = game.game_state.split(' ')
    const currentTurn = fenParts[1] // 'w' for white, 'b' for black

    // Determine player color
    let playerColor: 'white' | 'black' = 'white'
    if (game.black_player_id === user.id) {
      playerColor = 'black'
    } else if (game.white_player_id === user.id) {
      playerColor = 'white'
    }

    // Check if it's player's turn
    const isPlayerTurn = (currentTurn === 'w' && playerColor === 'white') || 
                        (currentTurn === 'b' && playerColor === 'black')

    // Check if player can move (all conditions)
    const canMove = game.status === 'active' && 
                   game.black_player_id !== null &&
                   (game.white_player_id === user.id || game.black_player_id === user.id) &&
                   isPlayerTurn

    const debugInfo: TurnDebugInfo = {
      gameId,
      userId: user.id,
      gameState: game.game_state,
      whitePlayerId: game.white_player_id,
      blackPlayerId: game.black_player_id,
      gameStatus: game.status,
      currentTurn,
      playerColor,
      isPlayerTurn,
      canMove
    }

    console.log('🐛 Turn Validation Debug:', debugInfo)
    return debugInfo

  } catch (error) {
    console.error('Debug turn validation failed:', error)
    return null
  }
}

export function logTurnValidationIssues(debugInfo: TurnDebugInfo) {
  console.log('🐛 Turn Validation Analysis:')
  
  if (!debugInfo.canMove) {
    console.log('❌ Player cannot move. Checking reasons:')
    
    if (debugInfo.gameStatus !== 'active') {
      console.log(`  - Game status is '${debugInfo.gameStatus}' (should be 'active')`)
    }
    
    if (!debugInfo.blackPlayerId) {
      console.log('  - No black player joined yet')
    }
    
    if (debugInfo.whitePlayerId !== debugInfo.userId && debugInfo.blackPlayerId !== debugInfo.userId) {
      console.log('  - User is not a player in this game')
    }
    
    if (!debugInfo.isPlayerTurn) {
      console.log(`  - Not player's turn (current: ${debugInfo.currentTurn}, player: ${debugInfo.playerColor})`)
    }
  } else {
    console.log('✅ Player should be able to move')
  }
}

// Quick function to test turn validation for current game
export async function quickTurnTest(gameId: string) {
  const debugInfo = await debugTurnValidation(gameId)
  if (debugInfo) {
    logTurnValidationIssues(debugInfo)
    return debugInfo
  }
  return null
}
