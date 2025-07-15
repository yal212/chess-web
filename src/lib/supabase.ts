import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseAnonKey &&
  supabaseUrl !== 'your_supabase_project_url' &&
  supabaseAnonKey !== 'your_supabase_anon_key'

// Client-side Supabase client with optimized real-time configuration
export const supabase = isSupabaseConfigured
  ? createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries: number) => Math.min(tries * 1000, 30000),
        timeout: 20000,
      },
    })
  : null

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
