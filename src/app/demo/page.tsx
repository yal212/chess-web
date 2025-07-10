'use client'

import Navigation from '@/components/layout/Navigation'
import ChessBoard from '@/components/chess/ChessBoard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      <div className="max-w-6xl mx-auto py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8 lg:mb-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Home
          </Link>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            Chess Demo
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Experience our interactive chess board! Play against yourself to explore all the features and test the functionality.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 items-start">
          {/* Chess Board - Center on mobile, left-aligned on desktop */}
          <div className="lg:col-span-2 flex justify-center">
            <ChessBoard
              playerColor="white"
              isSpectator={false}
            />
          </div>

          {/* Instructions Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 lg:p-8 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="bg-blue-100 text-blue-600 rounded-lg p-2 mr-3">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </span>
                How to Play
              </h2>
              <ul className="space-y-4 text-gray-700">
                <li className="flex items-start">
                  <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>Click on a piece to select it and see possible moves</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>Click on a highlighted square to move the piece</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>Drag and drop pieces for quick moves</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>All standard chess rules apply</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 mt-0.5 flex-shrink-0">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <span>View move history and game status below the board</span>
                </li>
              </ul>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 leading-relaxed">
                  <strong className="text-gray-700">Tip:</strong> You can play both sides to practice different strategies and test the game mechanics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
