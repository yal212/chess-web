'use client'

import { useState, useCallback, useEffect } from 'react'
import { Chess, Square } from 'chess.js'

export interface ChessGameState {
  game: Chess
  gameId?: string
  playerColor: 'white' | 'black'
  isPlayerTurn: boolean
  gameStatus: 'waiting' | 'active' | 'completed' | 'abandoned'
  winner?: 'white' | 'black' | 'draw'
  moveHistory: string[]
  resignedBy?: 'white' | 'black'
}

export function useChessGame(initialFen?: string) {
  console.log('🎯 useChessGame: Hook called', { initialFen })

  const [gameState, setGameState] = useState<ChessGameState>(() => {
    console.log('🎯 useChessGame: Initial state creation', { initialFen })
    return {
      game: new Chess(initialFen),
      playerColor: 'white',
      isPlayerTurn: true,
      gameStatus: 'active', // Start as active for demo mode
      moveHistory: []
    }
  })

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([])

  // Track recent local moves to prevent sync conflicts
  const [recentLocalMoves, setRecentLocalMoves] = useState<Set<string>>(new Set())

  // Get possible moves for a square
  const getPossibleMoves = useCallback((square: Square): Square[] => {
    const moves = gameState.game.moves({ square, verbose: true })
    return moves.map(move => move.to as Square)
  }, [gameState.game])

  // Make a move
  const makeMove = useCallback((from: Square, to: Square, promotion?: string) => {
    console.log('🎯 makeMove: Called with', { from, to, currentFen: gameState.game.fen() })

    try {
      // Create a copy of the game to test the move
      const gameCopy = new Chess(gameState.game.fen())
      const move = gameCopy.move({
        from,
        to,
        promotion: promotion || 'q' // Default to queen promotion
      })

      if (move) {
        const newFen = gameCopy.fen()

        console.log('🎯 makeMove: Local move made', { from, to, newFen, san: move.san })

        // Track this move as a recent local move
        setRecentLocalMoves(prev => {
          const newSet = new Set(prev)
          newSet.add(newFen)
          console.log('🎯 makeMove: Added to recent local moves', { newFen, totalTracked: newSet.size })
          // Keep only the last 5 moves to prevent memory leaks
          if (newSet.size > 5) {
            const firstItem = newSet.values().next().value
            if (firstItem) {
              newSet.delete(firstItem)
            }
          }
          return newSet
        })

        // Clear the recent move after a delay to allow for sync
        setTimeout(() => {
          setRecentLocalMoves(prev => {
            const newSet = new Set(prev)
            newSet.delete(newFen)
            console.log('🎯 makeMove: Cleared from recent local moves after timeout', { newFen })
            return newSet
          })
        }, 3000) // Increased to 3 seconds to be safer

        // Update state with the new game state immediately
        console.log('🔄 makeMove: Updating game state', {
          oldFen: gameState.game.fen(),
          newFen: newFen,
          move: move.san
        })

        setGameState(prev => {
          console.log('🔄 makeMove: setState callback', {
            prevFen: prev.game.fen(),
            newFen: newFen
          })
          return {
            ...prev,
            game: gameCopy, // Use the updated game copy
            moveHistory: [...prev.moveHistory, move.san]
          }
        })

        console.log('✅ makeMove: State update completed')
        return { success: true, move }
      } else {
        console.log('❌ makeMove: Invalid move')
        return { success: false, error: 'Invalid move' }
      }
    } catch (error) {
      console.log('❌ makeMove: Exception', error)
      return { success: false, error: 'Invalid move' }
    }
  }, [gameState.game])

  // Handle square click
  const onSquareClick = useCallback((square: Square) => {
    // If no square is selected, select this square if it has a piece
    if (!selectedSquare) {
      const piece = gameState.game.get(square)
      if (piece) {
        setSelectedSquare(square)
        setPossibleMoves(getPossibleMoves(square))
      }
      return
    }

    // If the same square is clicked, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null)
      setPossibleMoves([])
      return
    }

    // Try to make a move
    const moveResult = makeMove(selectedSquare, square)

    // Clear selection regardless of move success
    setSelectedSquare(null)
    setPossibleMoves([])

    return moveResult
  }, [selectedSquare, gameState.game, getPossibleMoves, makeMove])

  // Handle piece drop (drag and drop)
  const onPieceDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
    console.log('🎯 onPieceDrop: Starting move', { sourceSquare, targetSquare })

    const result = makeMove(sourceSquare, targetSquare)
    const success = result?.success || false

    console.log('🎯 onPieceDrop: Move result', { success, result })
    return success
  }, [makeMove])

  // Reset game
  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      game: new Chess(),
      moveHistory: [],
      gameStatus: 'active', // Set to active for demo mode
      winner: undefined,
      resignedBy: undefined,
      isPlayerTurn: true
    }))
    setSelectedSquare(null)
    setPossibleMoves([])
  }, [])

  // Resign game
  const resignGame = useCallback(() => {
    const currentPlayer = gameState.game.turn() === 'w' ? 'white' : 'black'
    const winner = currentPlayer === 'white' ? 'black' : 'white'

    setGameState(prev => ({
      ...prev,
      gameStatus: 'completed',
      winner,
      resignedBy: currentPlayer,
      isPlayerTurn: false
    }))

    // Clear any selections
    setSelectedSquare(null)
    setPossibleMoves([])
  }, [gameState.game])

  // Normalize FEN by removing move counters for comparison
  const normalizeFen = useCallback((fen: string) => {
    // FEN format: "pieces activeColor castling enPassant halfmove fullmove"
    // For comparison, we only care about the first 4 parts
    const parts = fen.split(' ')
    return parts.slice(0, 4).join(' ')
  }, [])

  // Check if a FEN position is a recent local move
  const isRecentLocalMove = useCallback((fen: string) => {
    const normalizedFen = normalizeFen(fen)
    const isRecent = Array.from(recentLocalMoves).some(trackedFen =>
      normalizeFen(trackedFen) === normalizedFen
    )
    console.log('🎯 isRecentLocalMove: Checking FEN', {
      fen,
      normalizedFen,
      isRecent,
      trackedMoves: Array.from(recentLocalMoves).map(f => normalizeFen(f))
    })
    return isRecent
  }, [recentLocalMoves, normalizeFen])

  // Update game from external state (for multiplayer)
  const updateGameState = useCallback((newState: Partial<ChessGameState>) => {
    console.log('🔄 updateGameState called', { newState, currentFen: gameState.game.fen() })

    setGameState(prev => {
      const updatedState = {
        ...prev,
        ...newState
      }

      // If a new game instance is provided, use it directly
      if (newState.game) {
        updatedState.game = newState.game
        console.log('🔄 updateGameState: New game instance', { newFen: newState.game.fen() })
      }

      return updatedState
    })
  }, [gameState.game])

  // Check game status
  useEffect(() => {
    const game = gameState.game
    let status: ChessGameState['gameStatus'] = 'active'
    let winner: ChessGameState['winner'] = undefined

    if (game.isGameOver()) {
      status = 'completed'
      if (game.isCheckmate()) {
        winner = game.turn() === 'w' ? 'black' : 'white'
      } else if (game.isDraw()) {
        winner = 'draw'
      }
    }

    if (status !== gameState.gameStatus || winner !== gameState.winner) {
      setGameState(prev => ({
        ...prev,
        gameStatus: status,
        winner
      }))
    }
  }, [gameState.game, gameState.gameStatus, gameState.winner])

  const currentFen = gameState.game.fen()

  // Debug FEN changes
  useEffect(() => {
    console.log('🎯 useChessGame: FEN changed', { currentFen })
  }, [currentFen])

  return {
    gameState,
    selectedSquare,
    possibleMoves,
    onSquareClick,
    onPieceDrop,
    makeMove,
    resetGame,
    resignGame,
    updateGameState,
    isRecentLocalMove,
    isCheck: gameState.game.isCheck(),
    isCheckmate: gameState.game.isCheckmate(),
    isDraw: gameState.game.isDraw(),
    isGameOver: gameState.game.isGameOver() || gameState.gameStatus === 'completed',
    currentFen,
    pgn: gameState.game.pgn()
  }
}
