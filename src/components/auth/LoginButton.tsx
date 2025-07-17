'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import { LogIn, UserPlus } from 'lucide-react'

export default function LoginButton() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-md h-10 w-24"></div>
    )
  }

  if (user) {
    return null // Account button will be handled by AccountButton component
  }

  return (
    <div className="flex items-center space-x-3">
      <Link href="/auth/signin">
        <Button
          variant="outline"
          size="md"
          className="border-2 border-white text-white hover:bg-white hover:text-gray-900 shadow-lg backdrop-blur-sm bg-white/10"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Button>
      </Link>

      <Link href="/auth/signup">
        <Button
          variant="gradient"
          size="md"
          className="shadow-lg hover:shadow-xl"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Sign Up
        </Button>
      </Link>
    </div>
  )
}
