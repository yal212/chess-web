-- Fix RLS Policy for Post-Game Actions
-- Run this in your Supabase SQL Editor

-- First, let's check the current game status for debugging
SELECT 
  id,
  status,
  winner,
  white_player_id,
  black_player_id,
  result_reason,
  completed_at
FROM games 
WHERE id = '598757f2-8613-4cb2-8f9b-862d75864f34';

-- Check current RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'post_game_actions' 
AND schemaname = 'public';

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert their own post-game actions" ON post_game_actions;

-- Create a more permissive INSERT policy that doesn't require completed status
-- (since the game might not be marked as completed yet when the UI appears)
CREATE POLICY "Users can insert their own post-game actions" ON post_game_actions 
FOR INSERT WITH CHECK (
  auth.uid() = player_id AND
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = post_game_actions.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
    -- Removed the status = 'completed' requirement
  )
);

-- Also create a more permissive SELECT policy if needed
DROP POLICY IF EXISTS "Users can view post-game actions from their games" ON post_game_actions;
CREATE POLICY "Users can view post-game actions from their games" ON post_game_actions 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = post_game_actions.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

-- Update the UPDATE policy to be consistent
DROP POLICY IF EXISTS "Users can update their own post-game actions" ON post_game_actions;
CREATE POLICY "Users can update their own post-game actions" ON post_game_actions 
FOR UPDATE USING (
  auth.uid() = player_id AND
  EXISTS (
    SELECT 1 FROM games 
    WHERE games.id = post_game_actions.game_id 
    AND (games.white_player_id = auth.uid() OR games.black_player_id = auth.uid())
  )
);

-- Test the policy by checking what auth.uid() returns
SELECT 
  auth.uid() as current_user_id,
  'Should match player_id in the error: 6a0744a7-364b-40fe-bb70-2f63b03d7149' as note;

-- Test if the user can access the game
SELECT 
  'User can access game: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM games 
    WHERE id = '598757f2-8613-4cb2-8f9b-862d75864f34'
    AND (white_player_id = auth.uid() OR black_player_id = auth.uid())
  ) THEN 'YES' ELSE 'NO' END as access_check;

-- Show the updated policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'post_game_actions' 
AND schemaname = 'public';

SELECT 'RLS policies updated successfully!' as status;
