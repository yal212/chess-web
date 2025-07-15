-- Simple Post-Game Migration Script
-- Run this in your Supabase SQL Editor if you're getting errors

-- Step 1: Add new columns to games table (safe if they already exist)
DO $$ 
BEGIN
  -- Add result_reason column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'result_reason'
  ) THEN
    ALTER TABLE games ADD COLUMN result_reason TEXT CHECK (result_reason IN ('checkmate', 'resignation', 'draw_agreement', 'stalemate', 'insufficient_material', 'threefold_repetition', 'fifty_move_rule', 'timeout', 'abandoned'));
  END IF;

  -- Add completed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE games ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Step 2: Create post_game_actions table (safe if it already exists)
CREATE TABLE IF NOT EXISTS post_game_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('play_again', 'leave')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Step 3: Enable RLS for post_game_actions (safe if already enabled)
ALTER TABLE post_game_actions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies (safe - will skip if they exist)
DO $$
BEGIN
  -- Policy for viewing post-game actions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_game_actions' AND policyname = 'Users can view post-game actions from their games'
  ) THEN
    CREATE POLICY "Users can view post-game actions from their games" ON post_game_actions FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM games 
        WHERE games.id = post_game_actions.game_id 
        AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
      )
    );
  END IF;

  -- Policy for inserting post-game actions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_game_actions' AND policyname = 'Users can insert their own post-game actions'
  ) THEN
    CREATE POLICY "Users can insert their own post-game actions" ON post_game_actions FOR INSERT WITH CHECK (
      auth.uid() = player_id AND
      EXISTS (
        SELECT 1 FROM games 
        WHERE games.id = post_game_actions.game_id 
        AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
        AND games.status = 'completed'
      )
    );
  END IF;

  -- Policy for updating post-game actions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'post_game_actions' AND policyname = 'Users can update their own post-game actions'
  ) THEN
    CREATE POLICY "Users can update their own post-game actions" ON post_game_actions FOR UPDATE USING (
      auth.uid() = player_id AND
      EXISTS (
        SELECT 1 FROM games 
        WHERE games.id = post_game_actions.game_id 
        AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
      )
    );
  END IF;
END $$;

-- Step 5: Create indexes (safe - will skip if they exist)
CREATE INDEX IF NOT EXISTS idx_games_completed_at ON games(completed_at);
CREATE INDEX IF NOT EXISTS idx_post_game_actions_game_id ON post_game_actions(game_id);
CREATE INDEX IF NOT EXISTS idx_post_game_actions_player_id ON post_game_actions(player_id);

-- Step 6: Enable real-time for post_game_actions (safe - will skip if already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'post_game_actions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.post_game_actions;
  END IF;
END $$;

-- Step 7: Create trigger function for auto-setting completed_at
CREATE OR REPLACE FUNCTION set_game_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger (safe - will replace if exists)
DROP TRIGGER IF EXISTS set_completed_at_trigger ON games;
CREATE TRIGGER set_completed_at_trigger
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION set_game_completed_at();

-- Step 9: Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_completed_games(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH games_to_delete AS (
    SELECT g.id
    FROM games g
    WHERE g.status = 'completed'
      AND g.completed_at < NOW() - INTERVAL '1 day' * days_old
      AND (
        (SELECT COUNT(*) FROM post_game_actions pga 
         WHERE pga.game_id = g.id AND pga.action = 'leave') = 2
        OR
        NOT EXISTS (SELECT 1 FROM post_game_actions pga WHERE pga.game_id = g.id)
      )
  )
  DELETE FROM games 
  WHERE id IN (SELECT id FROM games_to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Final verification
SELECT 'Migration completed successfully!' as status;

-- Show what was set up
SELECT 
  'post_game_actions table: ' || 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'post_game_actions' AND table_schema = 'public'
  ) THEN 'EXISTS' ELSE 'MISSING' END as table_check;

SELECT 
  'Real-time enabled: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'post_game_actions'
  ) THEN 'YES' ELSE 'NO' END as realtime_check;
