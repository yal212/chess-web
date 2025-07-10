'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { LogIn, LogOut, User } from 'lucide-react'

export default function LoginButton() {
  const { user, signInWithGoogle, signOut, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-md h-10 w-24"></div>
    )
  }

  if (user) {
    return null // Account button will be handled by AccountButton component
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={isLoading}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      ) : (
        <>
          <LogIn className="w-4 h-4 mr-2" />
          Sign in with Google
        </>
      )}
    </button>
  )
}
