'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw, X } from 'lucide-react'

interface AuthError {
  type: 'network' | 'token_refresh' | 'session' | 'unknown'
  message: string
  timestamp: Date
  canRetry: boolean
}

export function AuthErrorHandler() {
  const [errors, setErrors] = useState<AuthError[]>([])
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    // Listen for auth-related errors
    const handleAuthError = (event: CustomEvent<AuthError>) => {
      setErrors(prev => [...prev.slice(-2), event.detail]) // Keep only last 3 errors
    }

    // Listen for successful token refresh to clear errors
    const handleAuthSuccess = () => {
      setErrors([])
    }

    window.addEventListener('auth-error', handleAuthError as EventListener)
    window.addEventListener('auth-success', handleAuthSuccess)

    return () => {
      window.removeEventListener('auth-error', handleAuthError as EventListener)
      window.removeEventListener('auth-success', handleAuthSuccess)
    }
  }, [])

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      // Try to refresh the page to reinitialize auth
      window.location.reload()
    } catch (error) {
      console.error('Retry failed:', error)
    } finally {
      setIsRetrying(false)
    }
  }

  const dismissError = (index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index))
  }

  if (errors.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {errors.map((error, index) => (
        <div
          key={`${error.timestamp.getTime()}-${index}`}
          className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg max-w-md"
        >
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {error.type === 'network' && 'Connection Issue'}
                {error.type === 'token_refresh' && 'Authentication Issue'}
                {error.type === 'session' && 'Session Issue'}
                {error.type === 'unknown' && 'Authentication Error'}
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {error.message}
              </p>
              {error.canRetry && (
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Retry
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => dismissError(index)}
              className="ml-2 flex-shrink-0 text-red-400 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Helper function to dispatch auth errors
export function dispatchAuthError(error: Omit<AuthError, 'timestamp'>) {
  const authError: AuthError = {
    ...error,
    timestamp: new Date()
  }
  
  window.dispatchEvent(new CustomEvent('auth-error', { detail: authError }))
}

// Helper function to dispatch auth success
export function dispatchAuthSuccess() {
  window.dispatchEvent(new CustomEvent('auth-success'))
}
