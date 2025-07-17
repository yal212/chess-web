'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import AuthLayout from '@/components/auth/AuthLayout'
import Button from '@/components/ui/Button'
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!email) {
        throw new Error('Please enter your email address')
      }

      await resetPassword(email)
      setIsSuccess(true)
    } catch (error) {
      console.error('Reset password error:', error)
      setError((error as Error).message || 'An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="We've sent you a password reset link"
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
              Reset link sent!
            </h3>
            <p className="text-sm text-gray-600">
              We&apos;ve sent a password reset link to <strong>{email}</strong>
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
                  <li>2. Click the reset link in the email</li>
                  <li>3. Create a new password</li>
                  <li>4. Sign in with your new password</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Link>
            
            <div>
              <button
                onClick={() => {
                  setIsSuccess(false)
                  setEmail('')
                  setError('')
                }}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Send to a different email
              </button>
            </div>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a reset link"
    >
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            🔐 Password Reset Process
          </h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Enter the email address associated with your account</li>
            <li>• Check your email for a secure reset link</li>
            <li>• Click the link to create a new password</li>
            <li>• The link expires in 1 hour for security</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                className="block w-full pl-10 pr-3 py-2 border-2 border-gray-300 rounded-md shadow-sm placeholder-gray-500 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your email address"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            loading={isLoading}
            variant="gradient"
            size="lg"
            className="w-full"
          >
            Send Reset Link
          </Button>
        </form>

        {/* Back to Sign In */}
        <div className="text-center pt-4 border-t border-gray-200">
          <Link
            href="/auth/signin"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Sign In
          </Link>
        </div>

        {/* Help */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-800 mb-2">
            💡 Need help?
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Make sure you&apos;re using the correct email address</li>
            <li>• Check your spam/junk folder for the reset email</li>
            <li>• The reset link is valid for 1 hour only</li>
            <li>• If you don&apos;t receive the email, try again in a few minutes</li>
          </ul>
        </div>
      </div>
    </AuthLayout>
  )
}
