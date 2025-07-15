'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
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
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      loading={isLoading}
      variant="gradient"
      size="md"
    >
      {!isLoading && <LogIn className="w-4 h-4 mr-2" />}
      Sign in with Google
    </Button>
  )
}
