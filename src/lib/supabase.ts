import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_project_url' &&
  supabaseAnonKey !== 'your_supabase_anon_key'

// Client-side Supabase client with optimized real-time configuration and auth error handling
export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
        timeout: 20000,
      },
      global: {
        headers: {
          'X-Client-Info': 'chess-web-app'
        }
      }
    })
  : null

// Add global error handler for auth-related fetch failures
if (typeof window !== 'undefined' && supabase) {
  // Listen for auth errors globally
  supabase.auth.onAuthStateChange((event, _session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('✅ Auth token refreshed successfully')
    }
  })

  // Add a global fetch error handler
  const originalFetch = window.fetch
  window.fetch = async (...args) => {
    try {
      const response = await originalFetch(...args)
      return response
    } catch (error) {
      // Check if this is a Supabase auth-related fetch failure
      const url = args[0]?.toString() || ''
      if (url.includes(supabaseUrl!) && url.includes('/auth/v1/')) {
        console.error('🔴 Supabase auth fetch failed:', {
          url,
          error: error instanceof Error ? error.message : error,
          timestamp: new Date().toISOString()
        })

        // Dispatch auth error for user notification
        const { dispatchAuthError } = await import('@/components/AuthErrorHandler')
        dispatchAuthError({
          type: 'network',
          message: 'Connection to authentication server failed. Please check your internet connection.',
          canRetry: true
        })

        // Don't throw the error to prevent app crashes
        // The auth state change handler will handle the session state
        return new Response(JSON.stringify({ error: 'Network error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      throw error
    }
  }
}

// Database types
export interface User {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  white_player_id: string
  black_player_id?: string
  game_state: string // FEN notation
  moves: string[] // Array of moves in algebraic notation
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  winner?: 'white' | 'black' | 'draw'
  result_reason?: 'checkmate' | 'resignation' | 'draw_agreement' | 'stalemate' | 'insufficient_material' | 'threefold_repetition' | 'fifty_move_rule' | 'timeout' | 'abandoned'
  completed_at?: string
  created_at: string
  updated_at: string
}

export interface GameMove {
  id: string
  game_id: string
  player_id: string
  move: string
  fen_after: string
  created_at: string
}

export interface ChatMessage {
  id: string
  game_id: string
  user_id: string
  message: string
  created_at: string
}

export interface PostGameAction {
  id: string
  game_id: string
  player_id: string
  action: 'play_again' | 'leave'
  created_at: string
}
