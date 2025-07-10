'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { User, Settings, LogOut, ChevronDown } from 'lucide-react'

export default function AccountButton() {
  const { user, signOut, loading } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
      setIsDropdownOpen(false)
      router.push('/')
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileClick = () => {
    setIsDropdownOpen(false)
    router.push('/profile')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading || !user) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.display_name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getInitials(user.display_name)}
          </div>
        )}
        <span className="hidden sm:block">{user.display_name}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="px-4 py-2 text-sm text-gray-500 border-b">
              <div className="font-medium text-gray-900">{user.display_name}</div>
              <div className="text-xs">{user.email}</div>
            </div>
            
            <button
              onClick={handleProfileClick}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4 mr-3" />
              Profile
            </button>
            
            <button
              onClick={handleProfileClick}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 mr-3" />
              Account Settings
            </button>
            
            <div className="border-t">
              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-3"></div>
                ) : (
                  <LogOut className="w-4 h-4 mr-3" />
                )}
                {isLoading ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
