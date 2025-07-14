-- Setup Games Table and Related Tables
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  white_player_id UUID REFERENCES users(id) NOT NULL,
  black_player_id UUID REFERENCES users(id),
  game_state TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', -- Starting FEN
  moves TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
  winner TEXT CHECK (winner IN ('white', 'black', 'draw')),
  time_control INTEGER DEFAULT 600, -- 10 minutes in seconds
  white_time_left INTEGER DEFAULT 600,
  black_time_left INTEGER DEFAULT 600,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create game_moves table for detailed move history
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES users(id) NOT NULL,
  move TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  move_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Games policies
CREATE POLICY "Users can view games they're part of" ON games FOR SELECT USING (
  auth.uid() = white_player_id OR auth.uid() = black_player_id
);

CREATE POLICY "Users can create games" ON games FOR INSERT WITH CHECK (auth.uid() = white_player_id);

CREATE POLICY "Players can update their games" ON games FOR UPDATE USING (
  auth.uid() = white_player_id OR auth.uid() = black_player_id
);

CREATE POLICY "Users can delete games they created" ON games FOR DELETE USING (
  auth.uid() = white_player_id
);

-- Game moves policies
CREATE POLICY "Users can view moves from their games" ON game_moves FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = game_moves.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

CREATE POLICY "Players can insert moves in their games" ON game_moves FOR INSERT WITH CHECK (
  auth.uid() = player_id AND
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = game_moves.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

-- Chat messages policies
CREATE POLICY "Users can view chat from their games" ON chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = chat_messages.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

CREATE POLICY "Players can send chat in their games" ON chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = chat_messages.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_white_player ON games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_game_id ON chat_messages(game_id);

-- Verify the setup
SELECT 'Games table created successfully' as status;
SELECT 'Game moves table created successfully' as status;
SELECT 'Chat messages table created successfully' as status;
