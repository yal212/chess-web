'use client'

import { Chessboard } from 'react-chessboard'
import { Square } from 'chess.js'
import { useChessGame } from '@/hooks/useChessGame'
import { Crown, RotateCcw, Flag } from 'lucide-react'
import { useMemo } from 'react'

interface ChessBoardProps {
  gameId?: string
  playerColor?: 'white' | 'black'
  isSpectator?: boolean
  onMove?: (move: any) => void
  initialFen?: string
}

export default function ChessBoard({ 
  gameId, 
  playerColor = 'white', 
  isSpectator = false,
  onMove,
  initialFen 
}: ChessBoardProps) {
  const {
    gameState,
    selectedSquare,
    possibleMoves,
    onSquareClick,
    onPieceDrop,
    resetGame,
    isCheck,
    isCheckmate,
    isDraw,
    isGameOver,
    currentFen,
    pgn
  } = useChessGame(initialFen)

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
    if (isSpectator) return false

    const result = onPieceDrop(sourceSquare as Square, targetSquare as Square)

    if (result && onMove) {
      // Get the last move from the game
      const history = gameState.game.history({ verbose: true })
      const lastMove = history[history.length - 1]
      onMove(lastMove)
    }

    return result
  }

  const handleSquareClick = ({ square }: any) => {
    if (!isSpectator) {
      onSquareClick(square as Square)
    }
  }

  const getGameStatusMessage = () => {
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
    return `${gameState.game.turn() === 'w' ? 'White' : 'Black'} to move`
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Game Status */}
      <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-md text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold text-gray-800">
            {getGameStatusMessage()}
          </span>
        </div>
        
        {gameState.gameStatus === 'active' && (
          <div className="text-sm text-gray-600">
            Turn: {gameState.game.turn() === 'w' ? 'White' : 'Black'}
          </div>
        )}
      </div>

      {/* Chess Board */}
      <div className="relative">
        <Chessboard
          options={{
            position: currentFen,
            onPieceDrop: handlePieceDrop,
            onSquareClick: !isSpectator ? handleSquareClick : undefined,
            boardOrientation: playerColor,
            squareStyles: customSquareStyles,
            allowDrawingArrows: true,
            boardStyle: {
              borderRadius: '8px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              width: '400px',
              height: '400px'
            }
          }}
        />
        
        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
            <div className="bg-white p-6 rounded-lg text-center">
              <h3 className="text-xl font-bold mb-2">Game Over</h3>
              <p className="text-gray-600 mb-4">{getGameStatusMessage()}</p>
              {!isSpectator && (
                <button
                  onClick={resetGame}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  New Game
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Game Controls */}
      {!isSpectator && gameState.gameStatus === 'active' && (
        <div className="flex space-x-2">
          <button
            onClick={resetGame}
            className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </button>
          
          <button
            className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
          >
            <Flag className="h-4 w-4 mr-1" />
            Resign
          </button>
        </div>
      )}

      {/* Move History */}
      <div className="bg-white rounded-lg shadow-md p-4 w-full max-w-md">
        <h3 className="font-semibold text-gray-800 mb-2">Move History</h3>
        <div className="max-h-32 overflow-y-auto text-sm">
          {gameState.moveHistory.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {gameState.moveHistory.map((move, index) => (
                <div key={index} className="text-gray-600">
                  {Math.floor(index / 2) + 1}.{index % 2 === 0 ? '' : '..'} {move}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No moves yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
