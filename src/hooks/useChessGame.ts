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
  const [captureSquares, setCaptureSquares] = useState<Square[]>([])

  // Track recent local moves to prevent sync conflicts
  const [recentLocalMoves, setRecentLocalMoves] = useState<Set<string>>(new Set())

  // Get possible moves for a square
  const getPossibleMoves = useCallback((square: Square): Square[] => {
    const moves = gameState.game.moves({ square, verbose: true })
    return moves.map(move => move.to as Square)
  }, [gameState.game])

  // Get capture moves for a square
  const getCaptureSquares = useCallback((square: Square): Square[] => {
    const moves = gameState.game.moves({ square, verbose: true })
    return moves.filter(move => move.captured).map(move => move.to as Square)
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

        // Track this move as a recent local move with normalized FEN
        const normalizedNewFen = normalizeFen(newFen)
        setRecentLocalMoves(prev => {
          const newSet = new Set(prev)
          newSet.add(normalizedNewFen)
          console.log('🎯 makeMove: Added to recent local moves', {
            originalFen: newFen,
            normalizedFen: normalizedNewFen,
            totalTracked: newSet.size
          })
          // Keep only the last 3 moves to prevent memory leaks
          if (newSet.size > 3) {
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
            newSet.delete(normalizedNewFen)
            console.log('🎯 makeMove: Cleared from recent local moves after timeout', { normalizedNewFen })
            return newSet
          })
        }, 5000) // Increased to 5 seconds to be safer for slower networks

        // Update state with the new game state immediately and synchronously
        console.log('🔄 makeMove: Updating game state', {
          oldFen: gameState.game.fen(),
          newFen: newFen,
          move: move.san
        })

        // Use a synchronous state update approach
        const newGameState = {
          ...gameState,
          game: gameCopy, // Use the updated game copy
          moveHistory: [...gameState.moveHistory, move.san]
        }

        setGameState(newGameState)

        console.log('✅ makeMove: State update completed synchronously')
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
        setCaptureSquares(getCaptureSquares(square))
      }
      return
    }

    // If the same square is clicked, deselect
    if (selectedSquare === square) {
      setSelectedSquare(null)
      setPossibleMoves([])
      setCaptureSquares([])
      return
    }

    // Try to make a move
    const moveResult = makeMove(selectedSquare, square)

    // Clear selection regardless of move success
    setSelectedSquare(null)
    setPossibleMoves([])
    setCaptureSquares([])

    return moveResult
  }, [selectedSquare, gameState.game, getPossibleMoves, getCaptureSquares, makeMove])

  // Handle piece drop (drag and drop)
  const onPieceDrop = useCallback((sourceSquare: Square, targetSquare: Square) => {
    console.log('🎯 onPieceDrop: Starting move', { sourceSquare, targetSquare })

    try {
      // Create a copy of the game to test and make the move
      const gameCopy = new Chess(gameState.game.fen())
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Default to queen promotion
      })

      if (!move) {
        console.log('🎯 onPieceDrop: Invalid move detected')
        return false
      }

      console.log('🎯 onPieceDrop: Valid move detected', { move: move.san, newFen: gameCopy.fen() })

      // Move is valid - update state immediately and synchronously
      const newFen = gameCopy.fen()
      // Normalize FEN for tracking (remove move counters)
      const normalizedNewFen = newFen.split(' ').slice(0, 4).join(' ')

      // Track this move as a recent local move - track both the new position AND the old position
      setRecentLocalMoves(prev => {
        const newSet = new Set(prev)
        // Add the new position after the move
        newSet.add(normalizedNewFen)
        // Also add the old position to prevent syncing back to it
        const oldNormalizedFen = gameState.game.fen().split(' ').slice(0, 4).join(' ')
        newSet.add(oldNormalizedFen)

        console.log('🎯 onPieceDrop: Added to recent local moves', {
          originalFen: newFen,
          normalizedFen: normalizedNewFen,
          oldNormalizedFen,
          totalTracked: newSet.size
        })
        // Keep only the last 6 moves to prevent memory leaks (3 moves = 6 positions)
        if (newSet.size > 6) {
          const firstItem = newSet.values().next().value
          if (firstItem) {
            newSet.delete(firstItem)
          }
        }
        return newSet
      })

      // Clear the recent moves after a longer delay to ensure sync is complete
      setTimeout(() => {
        setRecentLocalMoves(prev => {
          const newSet = new Set(prev)
          newSet.delete(normalizedNewFen)
          const oldNormalizedFen = gameState.game.fen().split(' ').slice(0, 4).join(' ')
          newSet.delete(oldNormalizedFen)
          console.log('🎯 onPieceDrop: Cleared from recent local moves after timeout', {
            normalizedNewFen,
            oldNormalizedFen,
            remaining: newSet.size
          })
          return newSet
        })
      }, 10000) // Increased to 10 seconds to handle slower networks and database updates

      // Update the game state immediately
      setGameState(prev => {
        const newState = {
          ...prev,
          game: gameCopy,
          moveHistory: [...prev.moveHistory, move.san]
        }
        console.log('🎯 onPieceDrop: State updated', {
          oldFen: prev.game.fen(),
          newFen: gameCopy.fen(),
          move: move.san
        })
        return newState
      })

      console.log('🎯 onPieceDrop: Move successful, returning true')
      return true
    } catch (error) {
      console.log('🎯 onPieceDrop: Exception during move', error)
      return false
    }
  }, [gameState.game])

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
    setCaptureSquares([])
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
    setCaptureSquares([])
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
    const isRecent = recentLocalMoves.has(normalizedFen)

    console.log('🎯 isRecentLocalMove: Checking FEN', {
      fen,
      normalizedFen,
      isRecent,
      trackedMoves: Array.from(recentLocalMoves),
      currentGameFen: gameState.game.fen(),
      currentNormalized: normalizeFen(gameState.game.fen())
    })

    // Also check if this FEN matches our current game state
    const currentNormalized = normalizeFen(gameState.game.fen())
    if (normalizedFen === currentNormalized) {
      console.log('🎯 isRecentLocalMove: FEN matches current game state, treating as recent')
      return true
    }

    return isRecent
  }, [recentLocalMoves, normalizeFen, gameState.game])

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
    captureSquares,
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
