'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import LoginButton from '@/components/auth/LoginButton'
import AccountButton from '@/components/auth/AccountButton'
import { Crown, Home, User, Gamepad2 } from 'lucide-react'

export default function Navigation() {
  const { user } = useAuth()

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Crown className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">ChessHub</span>
            </Link>
          </div>

          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <Link
              href="/demo"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Demo</span>
            </Link>

            {user && (
              <>
                <Link
                  href="/play"
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <Gamepad2 className="w-4 h-4" />
                  <span>Play</span>
                </Link>
                <Link
                  href="/profile"
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
              </>
            )}

            <LoginButton />
            <AccountButton />
          </div>
        </div>
      </div>
    </nav>
  )
}
