-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 1200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_display_name TEXT;
  user_avatar_url TEXT;
BEGIN
  -- Extract display name with multiple fallbacks for Google OAuth
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'given_name',
    split_part(NEW.email, '@', 1)
  );

  -- Extract avatar URL with fallbacks
  user_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );

  -- Ensure display_name is not null or empty
  IF user_display_name IS NULL OR user_display_name = '' THEN
    user_display_name := split_part(NEW.email, '@', 1);
  END IF;

  INSERT INTO users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
    user_avatar_url
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and still return NEW to not break auth
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Games policies
CREATE POLICY "Users can view games they're part of" ON games FOR SELECT USING (
  auth.uid() = white_player_id OR auth.uid() = black_player_id
);
CREATE POLICY "Users can create games" ON games FOR INSERT WITH CHECK (auth.uid() = white_player_id);
CREATE POLICY "Players can update their games" ON games FOR UPDATE USING (
  auth.uid() = white_player_id OR auth.uid() = black_player_id
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
