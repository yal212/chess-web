'use client'

import { Chessboard } from 'react-chessboard'
import { Square, Chess } from 'chess.js'
import { useChessGame } from '@/hooks/useChessGame'
import { Crown, RotateCcw, Flag } from 'lucide-react'
import { useMemo, useEffect, useRef } from 'react'

interface ChessBoardProps {
  gameId?: string
  playerColor?: 'white' | 'black'
  isSpectator?: boolean
  onMove?: (move: any) => void
  initialFen?: string
  currentFen?: string // Current FEN from database
  moves?: string[] // Move history from database
  isPlayerTurn?: boolean // Whether it's the current player's turn
}

export default function ChessBoard({
  gameId,
  playerColor = 'white',
  isSpectator = false,
  onMove,
  initialFen,
  currentFen: externalFen,
  moves: externalMoves,
  isPlayerTurn = true
}: ChessBoardProps) {
  const {
    gameState,
    selectedSquare,
    possibleMoves,
    onSquareClick,
    onPieceDrop,
    resetGame,
    resignGame,
    updateGameState,
    isRecentLocalMove,
    isCheck,
    isCheckmate,
    isDraw,
    isGameOver,
    currentFen
  } = useChessGame(initialFen)

  // Track when we last made a local move to prevent immediate sync
  const lastLocalMoveTime = useRef<number>(0)

  // Calculate if it's actually the player's turn based on current position
  const actuallyPlayerTurn = (() => {
    const currentTurn = currentFen.split(' ')[1] // 'w' or 'b'
    return (currentTurn === 'w' && playerColor === 'white') ||
           (currentTurn === 'b' && playerColor === 'black')
  })()

  // Debug board configuration
  console.log('🎮 ChessBoard config:', {
    gameId,
    playerColor,
    isSpectator,
    isPlayerTurn,
    actuallyPlayerTurn,
    currentFen: currentFen.split(' ')[0] + '...',
    currentTurn: currentFen.split(' ')[1],
    gameStatus: gameState.gameStatus,
    externalFen: externalFen?.split(' ')[0] + '...',
    externalTurn: externalFen?.split(' ')[1],
    'Turn mismatch': isPlayerTurn !== actuallyPlayerTurn
  })

  // Debug position changes
  useEffect(() => {
    console.log('🎮 ChessBoard: Position changed', { currentFen })
  }, [currentFen])

  // Debug render
  console.log('🎮 ChessBoard: Rendering with position:', currentFen)

  // Sync external game state with local state (only for multiplayer games)
  useEffect(() => {
    console.log('🔄 ChessBoard sync effect triggered:', {
      gameId,
      hasExternalFen: !!externalFen,
      externalFen: externalFen?.substring(0, 50) + '...',
      currentFen: currentFen?.substring(0, 50) + '...',
      externalMoves: externalMoves?.length || 0,
      currentMoves: gameState.moveHistory?.length || 0
    })

    // Skip sync if no gameId (demo mode) or no external FEN
    if (!gameId || !externalFen) {
      console.log('🔄 Demo mode or no external FEN - skipping sync', { gameId, externalFen })
      return
    }

    // Additional safety check - if we're in demo mode, never sync
    if (gameId === 'demo' || !gameId.includes('-')) {
      console.log('🔄 Demo mode detected - skipping sync', { gameId })
      return
    }

    // Normalize FENs for comparison (ignore move counters)
    const normalizeForComparison = (fen: string) => {
      const parts = fen.split(' ')
      return parts.slice(0, 4).join(' ') // Only compare position, turn, castling, en passant
    }

    const normalizedExternal = normalizeForComparison(externalFen)
    const normalizedCurrent = normalizeForComparison(currentFen)

    // Skip sync if the external FEN is the starting position and we've already made a move
    const isStartingPosition = externalFen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w')
    const weHaveMoved = !currentFen.startsWith('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w')

    if (isStartingPosition && weHaveMoved) {
      console.log('🔄 Skipping sync - external FEN is starting position but we have already moved')
      return
    }

    // Check if move counts are different - this is a strong indicator we need to sync
    const externalMoveCount = externalMoves?.length || 0
    const currentMoveCount = gameState.moveHistory?.length || 0
    const moveCountDifferent = externalMoveCount !== currentMoveCount

    console.log('🔄 Sync analysis:', {
      normalizedExternal,
      normalizedCurrent,
      fensDifferent: normalizedExternal !== normalizedCurrent,
      moveCountDifferent,
      externalMoveCount,
      currentMoveCount,
      isStartingPosition,
      weHaveMoved
    })

    if (normalizedExternal !== normalizedCurrent || moveCountDifferent) {
      console.log('🔄 Sync needed - FEN mismatch or move count difference:', {
        external: externalFen,
        current: currentFen,
        normalizedExternal,
        normalizedCurrent,
        gameId,
        isStartingPosition,
        weHaveMoved,
        moveCountDifferent,
        externalMoveCount,
        currentMoveCount
      })

      // Check if this external FEN is from a recent local move
      if (isRecentLocalMove(externalFen)) {
        console.log('🔄 Skipping position sync - external FEN is from recent local move:', externalFen)

        // But still update move history if it's different
        if (moveCountDifferent && externalMoves && externalMoves.length > gameState.moveHistory.length) {
          console.log('🔄 Updating move history only (position sync skipped):', {
            externalMoves: externalMoves.length,
            currentMoves: gameState.moveHistory.length
          })

          // Update only the move history, keep the current game position
          updateGameState({
            game: gameState.game, // Keep current position
            moveHistory: externalMoves
          })
        }
        return
      }

      // Also check if the current FEN is a recent local move (we just made a move)
      if (isRecentLocalMove(currentFen)) {
        console.log('🔄 Skipping position sync - current FEN is from recent local move, waiting for database update:', currentFen)

        // But still update move history if it's different
        if (moveCountDifferent && externalMoves && externalMoves.length > gameState.moveHistory.length) {
          console.log('🔄 Updating move history only (current FEN is recent):', {
            externalMoves: externalMoves.length,
            currentMoves: gameState.moveHistory.length
          })

          // Update only the move history, keep the current game position
          updateGameState({
            game: gameState.game, // Keep current position
            moveHistory: externalMoves
          })
        }
        return
      }

      // Check if we made a local move very recently (within 3 seconds)
      const timeSinceLastMove = Date.now() - lastLocalMoveTime.current
      if (timeSinceLastMove < 3000) {
        console.log('🔄 Skipping position sync - local move made recently:', { timeSinceLastMove })

        // But still update move history if it's different
        if (moveCountDifferent && externalMoves && externalMoves.length > gameState.moveHistory.length) {
          console.log('🔄 Updating move history only (recent local move):', {
            externalMoves: externalMoves.length,
            currentMoves: gameState.moveHistory.length
          })

          // Update only the move history, keep the current game position
          updateGameState({
            game: gameState.game, // Keep current position
            moveHistory: externalMoves
          })
        }
        return
      }

      // If move counts are different, we definitely need to sync regardless of FEN
      if (moveCountDifferent) {
        console.log('🔄 Move count difference detected - forcing sync')
      } else {
        // Double-check that the positions are actually different after normalization
        // This prevents syncing when only move counters have changed
        try {
          const currentGame = new Chess(currentFen)
          const externalGame = new Chess(externalFen)

          // Compare the actual board positions
          if (currentGame.ascii() === externalGame.ascii() &&
              currentGame.turn() === externalGame.turn()) {
            console.log('🔄 Positions are identical, skipping sync')
            return
          }
        } catch (error) {
          console.log('🔄 Error comparing positions, proceeding with sync:', error)
        }
      }

      // Add a small delay to allow local state to settle before syncing
      const syncTimeout = setTimeout(() => {
        console.log('🔄 Syncing external game state:', {
          externalFen,
          externalMoves,
          moveCount: externalMoves?.length || 0
        })

        try {
          // Create a new Chess instance with the external FEN to validate it
          const externalGame = new Chess(externalFen)

          console.log('🔄 Updating game state with external data')
          updateGameState({
            game: externalGame,
            moveHistory: externalMoves || []
          })
          console.log('✅ External game state sync completed successfully')
          console.log('✅ New position:', externalGame.fen())
          console.log('✅ Move history:', externalMoves)
        } catch (error) {
          console.error('❌ Invalid FEN from external source:', externalFen, error)

          // Try to reconstruct the game from moves if FEN is invalid
          if (externalMoves && externalMoves.length > 0) {
            console.log('🔄 Attempting to reconstruct game from moves...')
            try {
              const reconstructedGame = new Chess()
              for (const move of externalMoves) {
                reconstructedGame.move(move)
              }
              console.log('✅ Game reconstructed from moves')
              updateGameState({
                game: reconstructedGame,
                moveHistory: externalMoves
              })
            } catch (reconstructError) {
              console.error('❌ Failed to reconstruct game from moves:', reconstructError)
            }
          }
        }
      }, 200) // Slightly longer delay to prevent race conditions

      return () => clearTimeout(syncTimeout)
    } else {
      console.log('🔄 FEN match - no sync needed:', { external: externalFen, current: currentFen })
    }
  }, [externalFen, currentFen, externalMoves, updateGameState, isRecentLocalMove, gameId])

  // Custom square styles for highlighting
  const customSquareStyles = useMemo(() => {
    const styles: { [square: string]: React.CSSProperties } = {}

    // Highlight selected square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(255, 255, 0, 0.4)'
      }
    }

    // Highlight possible moves
    possibleMoves.forEach(square => {
      styles[square] = {
        background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%'
      }
    })

    // Highlight check
    if (isCheck) {
      const kingSquare = gameState.game.board().flat().find(
        piece => piece && piece.type === 'k' && piece.color === gameState.game.turn()
      )
      if (kingSquare) {
        // Find king position - this is a simplified approach
        for (let rank = 0; rank < 8; rank++) {
          for (let file = 0; file < 8; file++) {
            const square = String.fromCharCode(97 + file) + (8 - rank) as Square
            const piece = gameState.game.get(square)
            if (piece && piece.type === 'k' && piece.color === gameState.game.turn()) {
              styles[square] = {
                backgroundColor: 'rgba(255, 0, 0, 0.4)'
              }
            }
          }
        }
      }
    }

    return styles
  }, [selectedSquare, possibleMoves, isCheck, gameState.game])

  const handlePieceDrop = ({ sourceSquare, targetSquare }: any) => {
    console.log('🎯🎯🎯 PIECE DROPPED:', { sourceSquare, targetSquare })
    console.log('🎮 Board state:', {
      gameId,
      isSpectator,
      isPlayerTurn,
      actuallyPlayerTurn,
      playerColor,
      currentTurn: currentFen.split(' ')[1],
      externalTurn: externalFen?.split(' ')[1]
    })

    if (isSpectator) {
      console.log('❌ Cannot move: spectator mode')
      return false
    }

    // Check if it's the player's turn (but allow moves in demo mode)
    // Use actuallyPlayerTurn for more reliable validation
    const canMove = actuallyPlayerTurn || gameId === 'demo' || !gameId

    console.log('🎯 Move validation:', {
      actuallyPlayerTurn,
      canMove,
      gameId,
      playerColor,
      currentTurn: currentFen.split(' ')[1],
      'Should be able to move': canMove
    })

    if (!canMove) {
      console.log('❌ Cannot move: not your turn', {
        isPlayerTurn,
        actuallyPlayerTurn,
        gameId,
        playerColor,
        currentTurn: currentFen.split(' ')[1],
        externalTurn: externalFen?.split(' ')[1],
        'Turn should be': playerColor === 'white' ? 'w' : 'b',
        'Current turn is': currentFen.split(' ')[1],
        'External turn is': externalFen?.split(' ')[1]
      })
      return false
    }

    console.log('✅ Turn validation passed, attempting move...')

    console.log('🔄 Attempting move with chess.js...')
    console.log('🔍 Current FEN before move:', currentFen)

    // Test the move first to get move data before updating state
    try {
      const testGame = new Chess(currentFen)
      const testMove = testGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      })

      if (!testMove) {
        console.log('❌ Invalid move detected in handlePieceDrop')
        return false
      }

      const newFen = testGame.fen()
      console.log('🎯 Valid move detected:', { move: testMove.san, newFen })

      // Now make the actual move
      const result = onPieceDrop(sourceSquare as Square, targetSquare as Square)
      console.log('🎯 Chess.js move result:', result)

      // Track when we made this local move
      if (result) {
        lastLocalMoveTime.current = Date.now()
        console.log('🎯 Recorded local move timestamp:', lastLocalMoveTime.current)
      }

      // Only proceed with onMove callback if the move was successful
      if (result && onMove && testMove) {
        console.log('✅ Move successful, calling onMove immediately...')

        // Validate the move data before sending
        if (!testMove.san || testMove.san === 'undefined-undefined') {
          console.error('❌ Invalid move SAN, not calling onMove:', testMove)
          return result
        }

        // Create the move object with all necessary data
        const moveWithFen = {
          san: testMove.san,
          from: testMove.from,
          to: testMove.to,
          piece: testMove.piece,
          captured: testMove.captured,
          promotion: testMove.promotion,
          after: newFen,
          fen: newFen
        }

        console.log('📝 Move with FEN:', moveWithFen)
        console.log('📝 Move SAN validation:', { san: testMove.san, isValid: !!testMove.san && testMove.san !== 'undefined-undefined' })

        onMove(moveWithFen)
        console.log('🎯 onMove called successfully')
      } else {
        console.log('❌ Move failed or no onMove callback', {
          result,
          hasOnMove: !!onMove,
          hasTestMove: !!testMove,
          testMoveSan: testMove?.san
        })
      }

      console.log('🔄 Returning result to react-chessboard:', result)
      console.log('🔄 Result type:', typeof result, 'Value:', result)

      // Return the actual result - true if move was successful, false otherwise
      return result
    } catch (error) {
      console.log('❌ Exception in handlePieceDrop:', error)
      return false
    }
  }

  const handleSquareClick = ({ square }: any) => {
    console.log('🎯🎯🎯 SQUARE CLICKED:', square)
    console.log('🎮 Click state:', {
      isSpectator,
      isPlayerTurn,
      actuallyPlayerTurn,
      playerColor,
      currentTurn: currentFen.split(' ')[1]
    })

    if (isSpectator) {
      console.log('❌ Cannot click: spectator mode')
      return
    }

    // Check if player can make moves
    const canClick = actuallyPlayerTurn || gameId === 'demo' || !gameId

    console.log('🎯 Click validation:', {
      actuallyPlayerTurn,
      canClick,
      playerColor,
      currentTurn: currentFen.split(' ')[1]
    })

    if (!canClick) {
      console.log('❌ Cannot click: not your turn', {
        isPlayerTurn,
        actuallyPlayerTurn,
        playerColor,
        currentTurn: currentFen.split(' ')[1]
      })
      return
    }

    console.log('✅ Click validation passed')

    console.log('🔄 Calling onSquareClick...')
    const result = onSquareClick(square as Square)
    console.log('🎯 Square click result:', result)

    // If a move was made, notify parent
    if (result && result.success && onMove) {
      console.log('🎯 Move made via click, notifying parent')

      // Track when we made this local move
      lastLocalMoveTime.current = Date.now()
      console.log('🎯 Recorded local click move timestamp:', lastLocalMoveTime.current)

      // Get the updated FEN from the game state
      const newFen = gameState.game.fen()

      const moveWithFen = {
        ...result.move,
        fen: newFen,
        timestamp: new Date().toISOString()
      }

      console.log('📝 Click move with FEN:', moveWithFen)
      onMove(moveWithFen)
    }
  }

  const getGameStatusMessage = () => {
    // Check for resignation first
    if (gameState.resignedBy) {
      const resignedPlayer = gameState.resignedBy === 'white' ? 'White' : 'Black'
      const winner = gameState.resignedBy === 'white' ? 'Black' : 'White'
      return `${resignedPlayer} resigned! ${winner} wins!`
    }
    if (isCheckmate) {
      const winner = gameState.game.turn() === 'w' ? 'Black' : 'White'
      return `Checkmate! ${winner} wins!`
    }
    if (isDraw) {
      return 'Game ended in a draw'
    }
    if (isCheck) {
      return 'Check!'
    }
    if (gameState.gameStatus === 'waiting') {
      return 'Waiting for opponent...'
    }

    const currentTurnColor = gameState.game.turn() === 'w' ? 'White' : 'Black'
    if (isPlayerTurn) {
      return `Your turn (${playerColor})`
    } else {
      return `Opponent's turn (${currentTurnColor})`
    }
  }

  return (
    <div className="flex flex-col items-center space-y-6 w-full max-w-lg mx-auto">
      {/* Game Status */}
      <div className="bg-white rounded-xl shadow-lg p-5 w-full text-center border border-gray-200">
        <div className="flex items-center justify-center space-x-3 mb-3">
          <Crown className="h-6 w-6 text-yellow-500" />
          <span className="font-bold text-gray-800 text-lg">
            {getGameStatusMessage()}
          </span>
        </div>

        {gameState.gameStatus === 'active' && (
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg py-2 px-3">
            Current Turn: <span className="font-semibold">{gameState.game.turn() === 'w' ? 'White' : 'Black'}</span>
          </div>
        )}
      </div>

      {/* Chess Board */}
      <div
        className={`relative w-full ${!isPlayerTurn && !isSpectator ? 'opacity-75' : ''}`}
        onClick={() => console.log('🎯🎯🎯 BOARD CONTAINER CLICKED')}
      >
        {/* Simplified Chessboard - minimal configuration */}
        <Chessboard
          options={{
            position: currentFen,
            onPieceDrop: (args: any) => {
              console.log('🎯🎯🎯 SIMPLE PIECE DROP:', args)
              const result = handlePieceDrop(args)
              console.log('🎯🎯🎯 SIMPLE DROP RESULT:', result)
              return result
            },
            onSquareClick: (args: any) => {
              console.log('🎯🎯🎯 SIMPLE SQUARE CLICK:', args)
              handleSquareClick(args)
            },
            boardOrientation: playerColor,
            allowDragging: true,
            squareStyles: customSquareStyles,
            boardStyle: {
              width: '400px',
              height: '400px'
            }
          }}
        />
        
        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-xl backdrop-blur-sm">
            <div className="bg-white p-8 rounded-xl text-center shadow-2xl border border-gray-200 max-w-sm mx-4">
              <div className="mb-4">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Game Over</h3>
                <p className="text-gray-600 text-lg">{getGameStatusMessage()}</p>
              </div>
              {!isSpectator && (
                <button
                  onClick={resetGame}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-semibold"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  New Game
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Game Controls */}
      {!isSpectator && gameState.gameStatus === 'active' && (
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={resetGame}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 shadow-sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Game
          </button>

          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to resign? This will end the game.')) {
                resignGame()
              }
            }}
            className="flex-1 inline-flex items-center justify-center px-4 py-3 border border-red-300 text-sm font-semibold rounded-lg text-red-700 bg-white hover:bg-red-50 transition-colors duration-200 shadow-sm"
          >
            <Flag className="h-4 w-4 mr-2" />
            Resign
          </button>
        </div>
      )}

      {/* Move History */}
      <div className="bg-white rounded-xl shadow-lg p-6 w-full border border-gray-200">
        <div className="flex items-center mb-4">
          <div className="bg-blue-100 text-blue-600 rounded-lg p-2 mr-3">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800">Move History</h3>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {gameState.moveHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {gameState.moveHistory.map((move, index) => (
                <div key={index} className="flex items-center p-2 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm">
                  <span className="text-gray-500 mr-2 font-semibold">
                    {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'}
                  </span>
                  <span className="font-semibold">{move}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No moves yet</p>
              <p className="text-gray-400 text-sm mt-1">Make your first move to start!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
