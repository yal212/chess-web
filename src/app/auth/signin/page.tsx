'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import AuthLayout from '@/components/auth/AuthLayout'
import SocialLogin from '@/components/auth/SocialLogin'
import EmailForm from '@/components/auth/EmailForm'

export default function SignInPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if already signed in
  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Don't render if user is already signed in (will redirect)
  if (user) {
    return null
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Chess Web account to continue playing"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            🎯 How to Sign In
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use Google for quick access (recommended)</li>
            <li>• Or sign in with your email and password</li>
            <li>• Forgot your password? Use the reset link below</li>
          </ul>
        </div>

        {/* Social Login */}
        <SocialLogin mode="signin" />

        {/* Email Form */}
        <EmailForm mode="signin" />

        {/* Forgot Password Link */}
        <div className="text-center">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Sign Up Link */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/signup"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign up for free
            </Link>
          </p>
        </div>

        {/* Additional Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            ✨ What you can do after signing in:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Play chess games with other players</li>
            <li>• Track your game history and statistics</li>
            <li>• Chat with opponents during games</li>
            <li>• Customize your profile and settings</li>
          </ul>
        </div>
      </div>
    </AuthLayout>
  )
}
