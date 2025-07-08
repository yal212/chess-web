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
}

export function useChessGame(initialFen?: string) {
  const [gameState, setGameState] = useState<ChessGameState>(() => ({
    game: new Chess(initialFen),
    playerColor: 'white',
    isPlayerTurn: true,
    gameStatus: 'active', // Start as active for demo mode
    moveHistory: []
  }))

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([])

  // Get possible moves for a square
  const getPossibleMoves = useCallback((square: Square): Square[] => {
    const moves = gameState.game.moves({ square, verbose: true })
    return moves.map(move => move.to as Square)
  }, [gameState.game])

  // Make a move
  const makeMove = useCallback((from: Square, to: Square, promotion?: string) => {
    // For demo mode, always allow moves (skip turn check)
    // In multiplayer mode, this would check gameState.isPlayerTurn

    try {
      // Create a copy of the game to test the move
      const gameCopy = new Chess(gameState.game.fen())
      const move = gameCopy.move({
        from,
        to,
        promotion: promotion || 'q' // Default to queen promotion
      })

      if (move) {
        // Update state with the new game state
        setGameState(prev => ({
          ...prev,
          game: gameCopy, // Use the updated game copy
          moveHistory: [...prev.moveHistory, move.san],
          isPlayerTurn: true // Keep as true for demo mode to allow continuous play
        }))

        return { success: true, move }
      } else {
        return { success: false, error: 'Invalid move' }
      }
    } catch (error) {
      return { success: false, error: 'Invalid move' }
    }
  }, [gameState.game])

  // Handle square click
  const onSquareClick = useCallback((square: Square) => {
    // If no square is selected, select this square if it has a piece
    if (!selectedSquare) {
      const piece = gameState.game.get(square)
      // For demo mode, allow selecting any piece (both colors)
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
    const result = makeMove(sourceSquare, targetSquare)
    return result?.success || false
  }, [makeMove])

  // Reset game
  const resetGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      game: new Chess(),
      moveHistory: [],
      gameStatus: 'active', // Set to active for demo mode
      winner: undefined,
      isPlayerTurn: true
    }))
    setSelectedSquare(null)
    setPossibleMoves([])
  }, [])

  // Update game from external state (for multiplayer)
  const updateGameState = useCallback((newState: Partial<ChessGameState>) => {
    setGameState(prev => ({
      ...prev,
      ...newState,
      game: newState.game ? new Chess(newState.game.fen()) : prev.game
    }))
  }, [])

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

  return {
    gameState,
    selectedSquare,
    possibleMoves,
    onSquareClick,
    onPieceDrop,
    makeMove,
    resetGame,
    updateGameState,
    isCheck: gameState.game.isCheck(),
    isCheckmate: gameState.game.isCheckmate(),
    isDraw: gameState.game.isDraw(),
    isGameOver: gameState.game.isGameOver(),
    currentFen: gameState.game.fen(),
    pgn: gameState.game.pgn()
  }
}
