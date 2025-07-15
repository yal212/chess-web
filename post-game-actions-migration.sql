-- Migration script to add post-game actions functionality
-- Run this in your Supabase SQL Editor

-- Step 1: Add new columns to games table
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS result_reason TEXT CHECK (result_reason IN ('checkmate', 'resignation', 'draw_agreement', 'stalemate', 'insufficient_material', 'threefold_repetition', 'fifty_move_rule', 'timeout', 'abandoned')),
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create post_game_actions table
CREATE TABLE IF NOT EXISTS post_game_actions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES users(id) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('play_again', 'leave')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id) -- Each player can only have one action per game
);

-- Step 3: Enable RLS for new table
ALTER TABLE post_game_actions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies for post_game_actions
CREATE POLICY "Users can view post-game actions from their games" ON post_game_actions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = post_game_actions.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own post-game actions" ON post_game_actions FOR INSERT WITH CHECK (
  auth.uid() = player_id AND
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = post_game_actions.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    AND games.status = 'completed'
  )
);

CREATE POLICY "Users can update their own post-game actions" ON post_game_actions FOR UPDATE USING (
  auth.uid() = player_id AND
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = post_game_actions.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_completed_at ON games(completed_at);
CREATE INDEX IF NOT EXISTS idx_post_game_actions_game_id ON post_game_actions(game_id);
CREATE INDEX IF NOT EXISTS idx_post_game_actions_player_id ON post_game_actions(player_id);

-- Step 6: Enable real-time for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_game_actions;

-- Step 7: Create function to automatically set completed_at when game status changes to completed
CREATE OR REPLACE FUNCTION set_game_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing to 'completed' and completed_at is not set
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.completed_at IS NULL THEN
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger to automatically set completed_at
DROP TRIGGER IF EXISTS set_completed_at_trigger ON games;
CREATE TRIGGER set_completed_at_trigger
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION set_game_completed_at();

-- Step 9: Create function to clean up old completed games and their actions
CREATE OR REPLACE FUNCTION cleanup_old_completed_games(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete games that have been completed for more than the specified days
  -- and both players have left (or no post-game actions exist)
  WITH games_to_delete AS (
    SELECT g.id
    FROM games g
    WHERE g.status = 'completed'
      AND g.completed_at < NOW() - INTERVAL '1 day' * days_old
      AND (
        -- Both players have left
        (SELECT COUNT(*) FROM post_game_actions pga 
         WHERE pga.game_id = g.id AND pga.action = 'leave') = 2
        OR
        -- No post-game actions exist (old games)
        NOT EXISTS (SELECT 1 FROM post_game_actions pga WHERE pga.game_id = g.id)
      )
  )
  DELETE FROM games 
  WHERE id IN (SELECT id FROM games_to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Verification
SELECT 'Post-game actions migration completed successfully!' as status;

-- Check if the new table was created
SELECT 
  'post_game_actions table created: ' || 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'post_game_actions' AND table_schema = 'public'
  ) THEN 'YES' ELSE 'NO' END as table_status;

-- Check if new columns were added
SELECT 
  'New columns added to games table: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'result_reason' AND table_schema = 'public'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'completed_at' AND table_schema = 'public'
  ) THEN 'YES' ELSE 'NO' END as columns_status;
