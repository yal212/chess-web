-- Debug Games Visibility Issues
-- Run this in Supabase SQL Editor to diagnose why available games aren't showing

-- 1. Check if games table exists and has data
SELECT 
  'Games Table Check' as info,
  COUNT(*) as total_games,
  COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_games,
  COUNT(CASE WHEN status = 'waiting' AND black_player_id IS NULL THEN 1 END) as available_games
FROM games;

-- 2. Show all games with details
SELECT 
  'All Games Details' as info,
  id,
  white_player_id,
  black_player_id,
  status,
  created_at,
  CASE 
    WHEN black_player_id IS NULL AND status = 'waiting' THEN 'AVAILABLE'
    WHEN black_player_id IS NOT NULL THEN 'FULL'
    ELSE status
  END as availability
FROM games
ORDER BY created_at DESC;

-- 3. Check current RLS policies
SELECT 
  'Current RLS Policies' as info,
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

-- 4. Check if RLS is enabled
SELECT 
  'RLS Status' as info,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'games' AND schemaname = 'public';

-- 5. Test what the current user can see (this will show what auth.uid() returns)
SELECT 
  'Current User Info' as info,
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- 6. Show games that should be visible to current user
SELECT 
  'Games Visible to Current User' as info,
  id,
  white_player_id,
  black_player_id,
  status,
  created_at,
  CASE 
    WHEN auth.uid() = white_player_id THEN 'MY_GAME_AS_WHITE'
    WHEN auth.uid() = black_player_id THEN 'MY_GAME_AS_BLACK'
    WHEN status = 'waiting' AND black_player_id IS NULL THEN 'AVAILABLE_TO_JOIN'
    ELSE 'NOT_VISIBLE'
  END as visibility_reason
FROM games
WHERE 
  auth.uid() = white_player_id OR 
  auth.uid() = black_player_id OR
  (status = 'waiting' AND black_player_id IS NULL)
ORDER BY created_at DESC;

SELECT 'Debug Complete - Check Results Above' as result;
