'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import Navigation from '@/components/layout/Navigation'
import LoginButton from '@/components/auth/LoginButton'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import GradientBackground from '@/components/ui/GradientBackground'
import AnimatedIcon from '@/components/ui/AnimatedIcon'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Crown, Users, Trophy, Zap, AlertCircle, X, Play, Gamepad2 } from 'lucide-react'

export default function Home() {
  const { user, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [errorDescription, setErrorDescription] = useState<string | null>(null)

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    const errorDescParam = urlParams.get('error_description')

    if (errorParam) {
      setError(errorParam)
      setErrorDescription(errorDescParam)
      const newUrl = window.location.pathname
      window.history.replaceState({}, document.title, newUrl)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center animate-fadeInUp">
          <div className="mb-8 animate-bounceIn">
            <Crown className="h-16 w-16 text-blue-600 mx-auto animate-spin" />
          </div>
          <LoadingSpinner size="xl" text="Loading ChessHub..." />
          <div className="mt-4 text-sm text-gray-500 animate-pulse">
            Preparing your chess experience...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {error && (
        <div className="bg-red-100 border border-red-300 rounded-md p-4 mx-4 mt-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-900">
                Authentication Error
              </h3>
              <div className="mt-2 text-sm text-red-800">
                <p>
                  {error === 'server_error' && 'Database error saving new user. Please try again.'}
                  {error === 'auth_error' && 'Authentication failed. Please try again.'}
                  {error === 'pkce_error' && 'Authentication configuration error. Please contact support.'}
                  {error === 'unexpected_error' && 'An unexpected error occurred. Please try again.'}
                  {!['server_error', 'auth_error', 'pkce_error', 'unexpected_error'].includes(error) && `Error: ${error}`}
                </p>
                {errorDescription && (
                  <p className="mt-1 text-xs text-red-700">
                    Details: {decodeURIComponent(errorDescription)}
                  </p>
                )}
              </div>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setError(null)}
                  className="inline-flex bg-red-100 rounded-md p-1.5 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-100 focus:ring-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Hero Section */}
      <section className="relative overflow-hidden" aria-label="Hero section">
        <GradientBackground variant="chess" opacity="strong" animated className="absolute inset-0" />

        {/* Floating chess pieces background - simplified */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-20 left-10 opacity-10 animate-fadeInLeft animate-delay-200">
            <Crown className="h-16 w-16 text-white" />
          </div>
          <div className="absolute top-40 right-20 opacity-10 animate-fadeInRight animate-delay-400">
            <Crown className="h-12 w-12 text-white" />
          </div>
          <div className="absolute bottom-40 left-20 opacity-10 animate-fadeInUp animate-delay-600">
            <Crown className="h-20 w-20 text-white" />
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-16 pb-20 sm:pt-20 sm:pb-28 lg:pt-28 lg:pb-36">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
              <div className="text-center lg:text-left lg:col-span-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight">
                  <span className="block text-white drop-shadow-2xl shadow-black/50 animate-fadeInUp animate-delay-200">Master the</span>
                  <span className="block bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent drop-shadow-lg animate-fadeInUp animate-delay-400">
                    Art of Chess
                  </span>
                </h1>
                <p className="mt-4 sm:mt-6 text-lg sm:text-xl text-gray-100 max-w-xl mx-auto lg:mx-0 leading-relaxed drop-shadow-lg shadow-black/50 animate-fadeInUp animate-delay-600" role="text">
                  Join thousands of players in the ultimate chess experience. Challenge friends, climb the leaderboards, and perfect your strategy in real-time multiplayer battles.
                </p>

                <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row sm:justify-center lg:justify-start gap-4 animate-fadeInUp animate-delay-800">
                  {user ? (
                    <>
                      <Link href="/play" className="w-full sm:w-auto">
                        <Button variant="gradient" size="xl" className="w-full">
                          <Play className="w-5 h-5 mr-2" />
                          Start Playing Now
                        </Button>
                      </Link>
                      <Link href="/demo" className="w-full sm:w-auto">
                        <Button variant="outline" size="xl" className="w-full border-2 border-white text-white hover:bg-white hover:text-gray-900 shadow-lg">
                          <Gamepad2 className="w-5 h-5 mr-2" />
                          Try Demo
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="w-full sm:w-auto">
                        <LoginButton />
                      </div>
                      <Link href="/demo" className="w-full sm:w-auto">
                        <Button variant="outline" size="xl" className="w-full border-2 border-white text-white hover:bg-white hover:text-gray-900 shadow-lg">
                          <Gamepad2 className="w-5 h-5 mr-2" />
                          Try Demo First
                        </Button>
                      </Link>
                    </>
                  )}
                </div>

                {/* Stats */}
                <div className="mt-10 sm:mt-12 grid grid-cols-3 gap-4 sm:gap-6 animate-fadeInUp animate-delay-700" role="region" aria-label="Platform statistics">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg shadow-black/50" aria-label="10,000 plus active players">10K+</div>
                    <div className="text-xs sm:text-sm text-gray-200 drop-shadow-md shadow-black/50">Active Players</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg shadow-black/50" aria-label="50,000 plus games played">50K+</div>
                    <div className="text-xs sm:text-sm text-gray-200 drop-shadow-md shadow-black/50">Games Played</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-lg shadow-black/50" aria-label="Available 24 hours a day, 7 days a week">24/7</div>
                    <div className="text-xs sm:text-sm text-gray-200 drop-shadow-md shadow-black/50">Online</div>
                  </div>
                </div>
              </div>

              <div className="mt-16 lg:mt-0 lg:col-span-6 animate-fadeInRight animate-delay-500">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl transform rotate-6 opacity-30"></div>
                  <div className="relative bg-white/15 backdrop-blur-lg rounded-3xl p-8 border border-white/30 shadow-2xl hover:shadow-3xl transition-shadow duration-300">
                    <div className="grid grid-cols-8 gap-1">
                      {Array.from({ length: 64 }, (_, i) => {
                        const row = Math.floor(i / 8)
                        const col = i % 8
                        const isLight = (row + col) % 2 === 0
                        return (
                          <div
                            key={i}
                            className={`aspect-square rounded-sm ${
                              isLight ? 'bg-white/30 shadow-sm' : 'bg-black/30 shadow-sm'
                            } flex items-center justify-center hover:scale-110 transition-transform duration-200`}
                          >
                            {(i === 0 || i === 7 || i === 56 || i === 63) && (
                              <Crown className="h-4 w-4 text-white/80 drop-shadow-sm" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-gray-100 to-white" aria-label="Platform features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-blue-700 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Everything you need to master chess
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-700">
              Experience chess like never before with our cutting-edge features designed for players of all levels.
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card variant="elevated" hover className="group transform transition-all duration-300 hover:scale-105">
                <div className="text-center">
                  <AnimatedIcon
                    icon={Users}
                    size="xl"
                    color="blue"
                    background
                    backgroundVariant="gradient"
                    className="mx-auto mb-6 group-hover:scale-110 transition-transform duration-300"
                  />
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-700 transition-colors duration-300">Real-time Multiplayer</h3>
                  <p className="text-gray-700 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                    Challenge players worldwide with instant move synchronization, live chat, and seamless matchmaking.
                  </p>
                </div>
              </Card>

              <Card variant="elevated" hover className="group transform transition-all duration-300 hover:scale-105">
                <div className="text-center">
                  <AnimatedIcon
                    icon={Trophy}
                    size="xl"
                    color="yellow"
                    background
                    backgroundVariant="gradient"
                    className="mx-auto mb-6 group-hover:scale-110 transition-transform duration-300"
                  />
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-yellow-700 transition-colors duration-300">Rankings & Achievements</h3>
                  <p className="text-gray-700 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                    Climb the leaderboards, earn achievements, and track your progress with detailed statistics and analytics.
                  </p>
                </div>
              </Card>

              <Card variant="elevated" hover className="group transform transition-all duration-300 hover:scale-105">
                <div className="text-center">
                  <AnimatedIcon
                    icon={Zap}
                    size="xl"
                    color="purple"
                    background
                    backgroundVariant="gradient"
                    className="mx-auto mb-6 group-hover:scale-110 transition-transform duration-300"
                  />
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-700 transition-colors duration-300">Lightning Fast</h3>
                  <p className="text-gray-700 leading-relaxed group-hover:text-gray-800 transition-colors duration-300">
                    Optimized for speed with sub-100ms response times and smooth animations on all devices.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
