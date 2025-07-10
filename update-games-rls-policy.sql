-- Update Games RLS Policy to Allow Viewing Available Games
-- This script safely updates the games table SELECT policy to allow users to see:
-- 1. Games they're part of (existing functionality)
-- 2. Games with status='waiting' that are available to join (new functionality)

-- First, let's check the current policy
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

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view games they're part of" ON games;

-- Create the new enhanced SELECT policy
CREATE POLICY "Users can view their games and available games" ON games 
FOR SELECT USING (
  -- Users can see games they're part of (existing functionality)
  auth.uid() = white_player_id OR 
  auth.uid() = black_player_id OR
  -- Users can see games that are waiting for players (new functionality)
  (status = 'waiting' AND black_player_id IS NULL)
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

-- Test the policy by checking what games are visible
-- This should show both user's games and available games
SELECT 
  'Policy Test - Visible Games' as info,
  id,
  white_player_id,
  black_player_id,
  status,
  created_at
FROM games
ORDER BY created_at DESC
LIMIT 10;

SELECT 'Games RLS Policy Update Complete' as result;
