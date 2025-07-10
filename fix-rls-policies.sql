-- Comprehensive fix for RLS policies to allow chess moves
-- Run this in your Supabase SQL Editor

-- First, let's see what we're working with
SELECT 'Current games table policies:' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'games' AND schemaname = 'public';

SELECT 'Current game_moves table policies:' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'game_moves' AND schemaname = 'public';

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Players can update their games" ON games;
DROP POLICY IF EXISTS "Players can insert moves in their games" ON game_moves;
DROP POLICY IF EXISTS "Users can view moves from their games" ON game_moves;

-- Create comprehensive games UPDATE policy
CREATE POLICY "Players can update their games" ON games
FOR UPDATE USING (
  -- Players can update games they're part of
  auth.uid() = white_player_id OR
  auth.uid() = black_player_id OR
  -- Allow users to join waiting games
  (status = 'waiting' AND black_player_id IS NULL AND auth.uid() != white_player_id)
)
WITH CHECK (
  -- Same conditions for updates
  auth.uid() = white_player_id OR
  auth.uid() = black_player_id OR
  (status = 'waiting' AND black_player_id IS NULL AND auth.uid() != white_player_id)
);

-- Create permissive game_moves INSERT policy
CREATE POLICY "Players can insert moves in their games" ON game_moves
FOR INSERT WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL AND
  -- Must be inserting own move
  auth.uid() = player_id AND
  -- Must be part of the game (either as white or black player)
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_moves.game_id
    AND (
      games.white_player_id = auth.uid() OR
      games.black_player_id = auth.uid() OR
      -- Allow moves in waiting games (single player testing)
      (games.status = 'waiting' AND games.white_player_id = auth.uid())
    )
  )
);

-- Create game_moves SELECT policy
CREATE POLICY "Users can view moves from their games" ON game_moves
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM games
    WHERE games.id = game_moves.game_id
    AND (
      games.white_player_id = auth.uid() OR
      games.black_player_id = auth.uid()
    )
  )
);

-- Verify new policies
SELECT 'Updated games table policies:' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'games' AND schemaname = 'public';

SELECT 'Updated game_moves table policies:' as info;
SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'game_moves' AND schemaname = 'public';

SELECT 'RLS Policy Fix Applied Successfully!' as result;
