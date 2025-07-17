'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import AuthLayout from '@/components/auth/AuthLayout'
import SocialLogin from '@/components/auth/SocialLogin'
import EmailForm from '@/components/auth/EmailForm'
import { CheckCircle, Mail } from 'lucide-react'

export default function SignUpPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

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

  const handleSignUpSuccess = () => {
    setShowSuccessMessage(true)
  }

  if (showSuccessMessage) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent you a verification link"
        showBackButton={false}
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              Account created successfully!
            </h3>
            <p className="text-sm text-gray-600">
              Please check your email and click the verification link to activate your account.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-left">
                <h4 className="text-sm font-medium text-blue-800">
                  Next Steps:
                </h4>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>1. Check your email inbox (and spam folder)</li>
                  <li>2. Click the verification link in the email</li>
                  <li>3. Return here and sign in to start playing!</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Join Chess Web"
      subtitle="Create your account to start playing chess online"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-800 mb-2">
            🚀 Getting Started
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Choose Google sign-up for instant access</li>
            <li>• Or create an account with email (requires verification)</li>
            <li>• Pick a display name that other players will see</li>
            <li>• Use a strong password (minimum 6 characters)</li>
          </ul>
        </div>

        {/* Social Login */}
        <SocialLogin mode="signup" />

        {/* Email Form */}
        <EmailForm mode="signup" onSuccess={handleSignUpSuccess} />

        {/* Terms and Privacy */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Sign In Link */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/auth/signin"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Sign in here
            </Link>
          </p>
        </div>

        {/* Features Preview */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-purple-800 mb-2">
            🎮 What&apos;s included with your free account:
          </h3>
          <ul className="text-sm text-purple-700 space-y-1">
            <li>• Unlimited chess games</li>
            <li>• Real-time multiplayer matches</li>
            <li>• Game history and move analysis</li>
            <li>• In-game chat with opponents</li>
            <li>• Customizable profile and avatar</li>
            <li>• No ads or premium restrictions</li>
          </ul>
        </div>
      </div>
    </AuthLayout>
  )
}
