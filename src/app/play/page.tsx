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
  time_control: number
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
  const [userGames, setUserGames] = useState<Game[]>([])
  const [availableGames, setAvailableGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joiningGameId, setJoiningGameId] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      console.log('User loaded, fetching games for:', user)
      fetchGames()

      // Also verify the user exists in the database
      verifyUserInDatabase()

      // Set up real-time subscriptions
      setupRealtimeSubscriptions()
    }

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeAllChannels()
    }
  }, [user])

  const setupRealtimeSubscriptions = () => {
    if (!user) return

    // Subscribe to games table changes
    const gamesSubscription = supabase
      .channel('games-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games'
        },
        (payload) => {
          console.log('Games table change:', payload)

          // Handle different types of changes
          if (payload.eventType === 'INSERT') {
            // New game created - refresh available games
            console.log('New game created:', payload.new)
            fetchGames()
          } else if (payload.eventType === 'UPDATE') {
            // Game updated (e.g., someone joined) - refresh both lists
            console.log('Game updated:', payload.new)
            fetchGames()
          } else if (payload.eventType === 'DELETE') {
            // Game deleted - refresh both lists
            console.log('Game deleted:', payload.old)
            fetchGames()
          }
        }
      )
      .subscribe((status) => {
        console.log('Games subscription status:', status)
      })

    return () => {
      gamesSubscription.unsubscribe()
    }
  }

  const verifyUserInDatabase = async () => {
    if (!user || !supabase) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('User verification error:', error)
        console.log('User may not exist in database, this could cause game creation to fail')
      } else {
        console.log('User verified in database:', data)
      }
    } catch (error) {
      console.error('Error verifying user:', error)
    }
  }

  const fetchGames = async () => {
    if (!user) return

    try {
      // Fetch user's games (games they're part of)
      const { data: userGamesData, error: userGamesError } = await supabase
        .from('games')
        .select(`
          *,
          white_player:users!games_white_player_id_fkey(display_name, avatar_url),
          black_player:users!games_black_player_id_fkey(display_name, avatar_url)
        `)
        .or(`white_player_id.eq.${user.id},black_player_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (userGamesError) throw userGamesError

      // Fetch available games (waiting games that user can join)
      const { data: availableGamesData, error: availableGamesError } = await supabase
        .from('games')
        .select(`
          *,
          white_player:users!games_white_player_id_fkey(display_name, avatar_url),
          black_player:users!games_black_player_id_fkey(display_name, avatar_url)
        `)
        .eq('status', 'waiting')
        .is('black_player_id', null)
        .neq('white_player_id', user.id) // Exclude user's own games
        .order('created_at', { ascending: false })

      if (availableGamesError) throw availableGamesError

      setUserGames(userGamesData || [])
      setAvailableGames(availableGamesData || [])
    } catch (error) {
      console.error('Error fetching games:', error)
    } finally {
      setLoading(false)
    }
  }

  const createGame = async () => {
    if (!user) {
      console.error('No user found when trying to create game')
      alert('You must be signed in to create a game. Please sign in first.')
      return
    }

    console.log('Creating game for user:', user)
    console.log('User ID:', user.id)
    console.log('Supabase client:', supabase)

    setCreating(true)

    try {
      // First, let's check if the games table exists by trying a simple query
      console.log('Checking if games table exists...')
      const { data: testData, error: testError } = await supabase
        .from('games')
        .select('count', { count: 'exact', head: true })

      if (testError) {
        console.error('Games table error:', {
          message: testError.message,
          details: testError.details,
          hint: testError.hint,
          code: testError.code
        })
        alert(`Database setup incomplete. Error: ${testError.message}. Please run the database setup in your Supabase dashboard.`)
        return
      }

      console.log('Games table exists, proceeding with game creation...')
      console.log('Inserting game with data:', {
        white_player_id: user.id,
        status: 'waiting'
      })

      const { data, error } = await supabase
        .from('games')
        .insert({
          white_player_id: user.id,
          status: 'waiting'
        })
        .select()
        .single()

      if (error) {
        console.error('Game creation error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          user_id: user.id
        })

        // Provide specific error messages based on error codes
        if (error.code === '23503') {
          alert('Foreign key constraint error: Your user profile may not exist in the database. Please sign out and sign in again.')
        } else if (error.code === '42501') {
          alert('Permission denied: Row Level Security policies may be blocking game creation. Please check the database setup.')
        } else {
          alert(`Failed to create game: ${error.message}`)
        }
        return
      }

      console.log('Game created successfully:', data)
      // Redirect to the game
      window.location.href = `/game/${data.id}`
    } catch (error) {
      console.error('Unexpected error creating game:', error)
      alert(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCreating(false)
    }
  }

  const joinGame = async (gameId: string) => {
    if (!user) return

    // Find the game to show confirmation dialog
    const game = availableGames.find(g => g.id === gameId)
    if (!game) return

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Join game against ${game.white_player?.display_name}?\n\n` +
      `Time control: ${Math.floor(game.time_control / 60)} minutes\n` +
      `You will play as Black.`
    )

    if (!confirmed) return

    setJoiningGameId(gameId)

    try {
      // First, verify the game is still available
      const { data: gameData, error: fetchError } = await supabase
        .from('games')
        .select(`
          *,
          white_player:users!games_white_player_id_fkey(display_name)
        `)
        .eq('id', gameId)
        .single()

      console.log('Game fetch result:', { gameData, fetchError })

      if (fetchError) {
        console.error('Game fetch error:', fetchError)
        throw new Error(`Game not found: ${fetchError.message}`)
      }

      // Detailed logging for debugging
      console.log('Game details:', {
        id: gameData.id,
        status: gameData.status,
        white_player_id: gameData.white_player_id,
        black_player_id: gameData.black_player_id,
        current_user_id: user.id
      })

      // Check if game is still available
      if (gameData.status !== 'waiting') {
        throw new Error(`This game has status '${gameData.status}' instead of 'waiting'.`)
      }

      if (gameData.black_player_id !== null) {
        throw new Error(`This game already has a black player: ${gameData.black_player_id}`)
      }

      // Check if user is trying to join their own game
      if (gameData.white_player_id === user.id) {
        throw new Error('You cannot join your own game.')
      }

      // Join the game with atomic update
      console.log('Attempting to join game with update...')
      const { data: updateData, error: updateError } = await supabase
        .from('games')
        .update({
          black_player_id: user.id,
          status: 'active'
        })
        .eq('id', gameId)
        .eq('status', 'waiting') // Additional safety check
        .is('black_player_id', null) // Additional safety check
        .select()

      console.log('Update result:', { updateData, updateError })

      if (updateError) {
        console.error('Update error:', updateError)
        throw new Error(`Failed to join game: ${updateError.message}`)
      }

      if (!updateData || updateData.length === 0) {
        // The update didn't affect any rows, meaning the conditions weren't met
        console.error('No rows updated - game conditions not met')

        // Fetch the game again to see current state
        const { data: currentGameData } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single()

        console.log('Current game state after failed update:', currentGameData)

        throw new Error(`Game is no longer available. Current status: ${currentGameData?.status}, Black player: ${currentGameData?.black_player_id}`)
      }

      console.log('Successfully joined game:', updateData[0])

      // Redirect to the game
      window.location.href = `/game/${gameId}`
    } catch (error) {
      console.error('Error joining game:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to join game. Please try again.'
      alert(errorMessage)

      // Refresh games list to show current state
      fetchGames()
    } finally {
      setJoiningGameId(null)
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

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Game Actions */}
          <div className="xl:col-span-1">
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

              <button
                onClick={() => {
                  console.log('Manually refreshing games...')
                  fetchGames()
                }}
                className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 mb-4"
              >
                🔄 Refresh Games
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

          {/* Available Games */}
          <div className="xl:col-span-1.5">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-green-600" />
                  Available Games
                  {availableGames.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {availableGames.length}
                    </span>
                  )}
                </h2>
              </div>

              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading available games...</p>
                  </div>
                ) : availableGames.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No games available to join.</p>
                    <p className="text-sm mt-1">Create a game to get started!</p>
                  </div>
                ) : (
                  availableGames.map((game) => (
                    <div key={game.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-3 h-3 rounded-full bg-green-400"></div>
                          </div>

                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">
                                {game.white_player?.display_name}
                              </span>
                              <span className="text-gray-500 text-sm">waiting for opponent</span>
                            </div>
                            <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {Math.floor(game.time_control / 60)}min
                              </span>
                              <span>
                                {new Date(game.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => joinGame(game.id)}
                          disabled={joiningGameId === game.id}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {joiningGameId === game.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            'Join'
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Your Games */}
          <div className="xl:col-span-1.5">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-blue-600" />
                  Your Games
                  {userGames.length > 0 && (
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {userGames.length}
                    </span>
                  )}
                </h2>
              </div>

              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading your games...</p>
                  </div>
                ) : userGames.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>No games yet. Create your first game!</p>
                  </div>
                ) : (
                  userGames.map((game) => (
                    <div key={game.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
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
                            <div className="flex items-center space-x-3 mt-1 text-sm text-gray-500">
                              <span className="capitalize">{game.status}</span>
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(game.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Link
                          href={`/game/${game.id}`}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        >
                          {game.status === 'active' ? 'Continue' : 'View'}
                        </Link>
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
