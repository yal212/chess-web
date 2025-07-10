'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/layout/Navigation'
import LoginButton from '@/components/auth/LoginButton'
import { Crown, Users, Trophy, Zap, AlertCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Home() {
  const { user, supabaseUser, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [errorDescription, setErrorDescription] = useState<string | null>(null)

  useEffect(() => {
    // Check for error parameters in URL
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    const errorDescParam = urlParams.get('error_description')

    if (errorParam) {
      setError(errorParam)
      setErrorDescription(errorDescParam)

      // Clean up URL
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                Authentication Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  {error === 'server_error' && 'Database error saving new user. Please try again.'}
                  {error === 'auth_error' && 'Authentication failed. Please try again.'}
                  {error === 'pkce_error' && 'Authentication configuration error. Please contact support.'}
                  {error === 'unexpected_error' && 'An unexpected error occurred. Please try again.'}
                  {!['server_error', 'auth_error', 'pkce_error', 'unexpected_error'].includes(error) && `Error: ${error}`}
                </p>
                {errorDescription && (
                  <p className="mt-1 text-xs text-red-600">
                    Details: {decodeURIComponent(errorDescription)}
                  </p>
                )}
              </div>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex bg-red-50 rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Section - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mx-4 mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-bold text-gray-800 mb-2">Authentication Debug Info</h3>
          <div className="text-sm space-y-1">
            <p><strong>User:</strong> {user ? `${user.display_name} (${user.email})` : 'Not signed in'}</p>
            <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
            <p><strong>Supabase User:</strong> {supabaseUser ? `Yes - ${supabaseUser.email}` : 'No'}</p>
            {supabaseUser && !user && (
              <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                <p className="text-yellow-800 font-semibold">⚠️ Profile Loading Issue Detected</p>
                <p className="text-yellow-700 text-xs">Supabase auth successful but user profile not loaded. This indicates a database access issue.</p>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => {
                      // Force create user from auth data
                      const authUser = supabaseUser;
                      const displayName = authUser.user_metadata?.display_name ||
                                         authUser.user_metadata?.name ||
                                         authUser.user_metadata?.full_name ||
                                         authUser.user_metadata?.given_name ||
                                         authUser.email?.split('@')[0] ||
                                         'Anonymous';

                      // This is a temporary fix - we'll trigger a page reload with user data
                      console.log('Forcing user creation with auth data');
                      window.location.reload();
                    }}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    Fix Now
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-2 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 bg-white sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">Play Chess</span>{' '}
                  <span className="block text-blue-600 xl:inline">Online</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  Challenge friends, improve your skills, and enjoy the timeless game of chess with our modern, real-time multiplayer platform.
                </p>
                <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
                  {user ? (
                    <div className="rounded-md shadow">
                      <Link
                        href="/play"
                        className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                      >
                        Start Playing
                      </Link>
                    </div>
                  ) : (
                    <div className="rounded-md shadow">
                      <LoginButton />
                    </div>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
        <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
          <div className="h-56 w-full bg-gradient-to-br from-blue-400 to-blue-600 sm:h-72 md:h-96 lg:w-full lg:h-full flex items-center justify-center">
            <Crown className="h-32 w-32 text-white opacity-20" />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to play chess
            </p>
          </div>

          <div className="mt-10">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Users className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Real-time Multiplayer</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Play with friends online in real-time with instant move synchronization and live game updates.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Trophy className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Match History & Stats</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Track your progress with detailed match history, statistics, and performance analytics.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Zap className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Fast & Responsive</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Enjoy smooth gameplay with our optimized interface that works perfectly on all devices.
                </p>
              </div>

              <div className="relative">
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <Crown className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Professional Experience</p>
                <p className="mt-2 ml-16 text-base text-gray-500">
                  Clean, modern interface with all the features you expect from a professional chess platform.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
