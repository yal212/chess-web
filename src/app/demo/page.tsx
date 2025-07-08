'use client'

import Navigation from '@/components/layout/Navigation'
import ChessBoard from '@/components/chess/ChessBoard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Chess Demo
          </h1>
          <p className="text-lg text-gray-600">
            Try out the chess board! You can play against yourself to test the functionality.
          </p>
        </div>

        <div className="flex justify-center">
          <ChessBoard 
            playerColor="white"
            isSpectator={false}
          />
        </div>

        <div className="mt-8 max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">How to Play</h2>
            <ul className="space-y-2 text-gray-600">
              <li>• Click on a piece to select it</li>
              <li>• Click on a highlighted square to move the piece</li>
              <li>• You can also drag and drop pieces</li>
              <li>• The game follows standard chess rules</li>
              <li>• Move history is shown below the board</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
