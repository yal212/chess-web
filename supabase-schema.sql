-- ChessHub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    white_player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    black_player_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    game_state TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    moves TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'abandoned')),
    winner TEXT CHECK (winner IN ('white', 'black', 'draw')),
    result_reason TEXT CHECK (result_reason IN ('checkmate', 'resignation', 'draw_agreement', 'stalemate', 'insufficient_material', 'threefold_repetition', 'fifty_move_rule', 'timeout', 'abandoned')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create game_moves table for detailed move history
CREATE TABLE IF NOT EXISTS public.game_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    move TEXT NOT NULL,
    fen_after TEXT NOT NULL,
    move_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post_game_actions table
CREATE TABLE IF NOT EXISTS public.post_game_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('play_again', 'leave')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, player_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_white_player ON public.games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON public.games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON public.games(created_at);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON public.game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_player_id ON public.game_moves(player_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_game_id ON public.chat_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_post_game_actions_game_id ON public.post_game_actions(game_id);

-- Create foreign key constraints with proper names
ALTER TABLE public.games 
ADD CONSTRAINT games_white_player_id_fkey 
FOREIGN KEY (white_player_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.games 
ADD CONSTRAINT games_black_player_id_fkey 
FOREIGN KEY (black_player_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_games_updated_at
    BEFORE UPDATE ON public.games
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user creation from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    display_name_value TEXT;
    avatar_url_value TEXT;
BEGIN
    -- Extract display name from various possible metadata fields
    display_name_value := COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'given_name',
        split_part(NEW.email, '@', 1),
        'Anonymous'
    );
    
    -- Extract avatar URL from metadata
    avatar_url_value := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );
    
    -- Insert into public.users table with error handling
    BEGIN
        INSERT INTO public.users (id, email, display_name, avatar_url)
        VALUES (
            NEW.id,
            NEW.email,
            display_name_value,
            avatar_url_value
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the authentication
        RAISE WARNING 'Failed to create user profile for %: %', NEW.email, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_game_actions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view all profiles" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for games table
CREATE POLICY "Users can view games they participate in" ON public.games
    FOR SELECT USING (
        auth.uid() = white_player_id OR
        auth.uid() = black_player_id OR
        status = 'waiting'
    );

CREATE POLICY "Users can create games" ON public.games
    FOR INSERT WITH CHECK (auth.uid() = white_player_id);

CREATE POLICY "Players can update their games" ON public.games
    FOR UPDATE USING (
        auth.uid() = white_player_id OR
        auth.uid() = black_player_id
    );

-- Create RLS policies for game_moves table
CREATE POLICY "Users can view moves for their games" ON public.game_moves
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.games
            WHERE games.id = game_moves.game_id
            AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
        )
    );

CREATE POLICY "Players can insert moves for their games" ON public.game_moves
    FOR INSERT WITH CHECK (
        auth.uid() = player_id AND
        EXISTS (
            SELECT 1 FROM public.games
            WHERE games.id = game_moves.game_id
            AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
        )
    );

-- Create RLS policies for chat_messages table
CREATE POLICY "Users can view chat for their games" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.games
            WHERE games.id = chat_messages.game_id
            AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
        )
    );

CREATE POLICY "Players can send chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.games
            WHERE games.id = chat_messages.game_id
            AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
        )
    );

-- Create RLS policies for post_game_actions table
CREATE POLICY "Users can view post-game actions for their games" ON public.post_game_actions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.games
            WHERE games.id = post_game_actions.game_id
            AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
        )
    );

CREATE POLICY "Players can create post-game actions" ON public.post_game_actions
    FOR INSERT WITH CHECK (
        auth.uid() = player_id AND
        EXISTS (
            SELECT 1 FROM public.games
            WHERE games.id = post_game_actions.game_id
            AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
        )
    );

CREATE POLICY "Players can update their post-game actions" ON public.post_game_actions
    FOR UPDATE USING (auth.uid() = player_id);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_game_actions;
