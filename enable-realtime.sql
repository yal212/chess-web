-- Enable real-time for the games table
-- Run this in your Supabase SQL Editor

-- First, check if real-time is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'games' AND schemaname = 'public';

-- Enable real-time for the games table
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- Verify real-time is enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Also enable for game_moves table if needed
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;

-- Check current RLS policies that might affect real-time
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('games', 'game_moves') 
AND schemaname = 'public';

-- Ensure the games table has proper real-time policies
-- Real-time subscriptions need to respect RLS, so we need to ensure
-- the policies allow the authenticated user to see updates

-- Check if there are any issues with the current policies
SELECT 
  t.schemaname,
  t.tablename,
  t.rowsecurity,
  p.policyname,
  p.cmd,
  p.permissive
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.tablename = 'games' AND t.schemaname = 'public';

-- If needed, create a more permissive policy for real-time (be careful with this)
-- This is only if the existing policies are too restrictive for real-time

-- Test query to verify the user can see the games
-- (This should be run as the authenticated user)
-- SELECT * FROM games WHERE id = 'your-game-id';

SELECT 'Real-time setup completed. Please verify in Supabase dashboard that real-time is enabled for the games table.' as status;
