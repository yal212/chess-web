'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import Navigation from '@/components/layout/Navigation'
import ChessBoard from '@/components/chess/ChessBoard'
import { Plus, Users, Clock, Trophy } from 'lucide-react'
import Link from 'next/link'

interface Game {
  id: string
  white_player_id: string
  black_player_id?: string
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  created_at: string
  white_player?: {
    display_name: string
    avatar_url?: string
  }
  black_player?: {
    display_name: string
    avatar_url?: string
  }
}

export default function PlayPage() {
  const { user } = useAuth()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (user) {
      fetchGames()
    }
  }, [user])

  const fetchGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          white_player:users!games_white_player_id_fkey(display_name, avatar_url),
          black_player:users!games_black_player_id_fkey(display_name, avatar_url)
        `)
        .or(`white_player_id.eq.${user?.id},black_player_id.eq.${user?.id}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGames(data || [])
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const createGame = async () => {
    if (!user) return

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('games')
        .insert({
          white_player_id: user.id,
          status: 'waiting'
        })
        .select()
        .single()

      if (error) throw error
      
      // Redirect to the game
      window.location.href = `/game/${data.id}`
    } catch (error) {
      console.error('Error creating game:', error)
    } finally {
      setCreating(false)
    }
  }

  const joinGame = async (gameId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('games')
        .update({
          black_player_id: user.id,
          status: 'active'
        })
        .eq('id', gameId)

      if (error) throw error
      
      // Redirect to the game
      window.location.href = `/game/${gameId}`
    } catch (error) {
      console.error('Error joining game:', error)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
              Sign in to Play Chess
            </h1>
            <p className="text-lg text-gray-600">
              You need to be signed in to create or join games.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Play Chess</h1>
          <p className="text-lg text-gray-600">Create a new game or join an existing one</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
              
              <button
                onClick={createGame}
                disabled={creating}
                className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {creating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Game
                  </>
                )}
              </button>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Game Statistics</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Trophy className="h-4 w-4 mr-2" />
                    <span>Games Played: {user.games_played || 0}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Rating: {user.rating || 1200}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Games List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Your Games</h2>
              </div>
              
              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading games...</p>
                  </div>
                ) : games.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No games yet. Create your first game!</p>
                  </div>
                ) : (
                  games.map((game) => (
                    <div key={game.id} className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className={`w-3 h-3 rounded-full ${
                              game.status === 'waiting' ? 'bg-yellow-400' :
                              game.status === 'active' ? 'bg-green-400' :
                              'bg-gray-400'
                            }`}></div>
                          </div>
                          
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {game.white_player?.display_name}
                              </span>
                              <span className="text-gray-500">vs</span>
                              <span className="font-medium text-gray-900">
                                {game.black_player?.display_name || 'Waiting...'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span className="capitalize">{game.status}</span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {new Date(game.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          {game.status === 'waiting' && game.white_player_id !== user.id ? (
                            <button
                              onClick={() => joinGame(game.id)}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                            >
                              Join Game
                            </button>
                          ) : (
                            <Link
                              href={`/game/${game.id}`}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                              {game.status === 'active' ? 'Continue' : 'View'}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
