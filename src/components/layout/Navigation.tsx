'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import LoginButton from '@/components/auth/LoginButton'
import AccountButton from '@/components/auth/AccountButton'
import Button from '@/components/ui/Button'
import { Crown, Home, User, Gamepad2, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navigation() {
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="bg-white/95 backdrop-blur-md shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <Crown className="h-8 w-8 text-blue-600 group-hover:text-purple-600 transition-colors duration-200" />
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ChessHub
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              href="/"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-50"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <Link
              href="/demo"
              className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-50"
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Demo</span>
            </Link>

            {user && (
              <Link href="/play">
                <Button variant="gradient" size="sm">
                  <Gamepad2 className="w-4 h-4 mr-1" />
                  Play Now
                </Button>
              </Link>
            )}

            <div className="flex items-center space-x-3">
              <LoginButton />
              <AccountButton />
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600 p-2 rounded-lg transition-colors duration-200"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-2">
            <Link
              href="/"
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </Link>

            <Link
              href="/demo"
              className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-50"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Gamepad2 className="w-4 h-4" />
              <span>Demo</span>
            </Link>

            {user && (
              <Link
                href="/play"
                className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-blue-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Play</span>
              </Link>
            )}

            <div className="pt-4 border-t border-gray-200 space-y-2">
              <div className="px-3">
                <LoginButton />
              </div>
              <div className="px-3">
                <AccountButton />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
