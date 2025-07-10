-- Fix Join Game Policy - Allow Users to Join Available Games
-- This fixes the UPDATE policy so users can join games they're not yet part of

-- First, check current policies
SELECT 
  'Current Games RLS Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'games' AND schemaname = 'public'
ORDER BY policyname;

-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Players can update their games" ON games;

-- Create the new UPDATE policy that allows:
-- 1. Players to update games they're already part of (existing functionality)
-- 2. Users to join available games (new functionality)
CREATE POLICY "Players can update games and join available games" ON games
FOR UPDATE USING (
  -- Users can update games they're already part of
  auth.uid() = white_player_id OR
  auth.uid() = black_player_id OR
  -- Users can join games that are waiting and have no black player
  (status = 'waiting' AND black_player_id IS NULL AND auth.uid() != white_player_id)
);

-- Verify the new policy was created
SELECT 
  'Updated Games RLS Policies' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'games' AND schemaname = 'public'
ORDER BY policyname;

-- Test the policy by showing what games are visible and updatable
SELECT 
  'Policy Test - Games Status' as info,
  id,
  white_player_id,
  black_player_id,
  status,
  created_at,
  CASE 
    WHEN auth.uid() = white_player_id THEN 'MY_GAME_AS_WHITE'
    WHEN auth.uid() = black_player_id THEN 'MY_GAME_AS_BLACK'
    WHEN status = 'waiting' AND black_player_id IS NULL AND auth.uid() != white_player_id THEN 'CAN_JOIN'
    ELSE 'READ_ONLY'
  END as my_access
FROM games
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Join Game Policy Fix Complete' as result;
