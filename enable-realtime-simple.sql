-- Simple script to enable Supabase real-time for games table
-- Run this in your Supabase SQL Editor

-- Step 1: Check what tables currently have real-time enabled
SELECT 
  'Current real-time enabled tables:' as info,
  schemaname, 
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Step 2: Enable real-time for the games table
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- Step 3: Also enable for game_moves table (optional, for move history)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;

-- Step 4: Verify real-time is now enabled
SELECT 
  'Real-time now enabled for:' as info,
  schemaname, 
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('games', 'game_moves');

-- Step 5: Check if there are any RLS policies that might block real-time
SELECT 
  'Current RLS policies on games table:' as info,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'games' 
AND schemaname = 'public';

-- Step 6: Grant basic permissions (usually already set, but just in case)
GRANT SELECT ON public.games TO authenticated;
GRANT SELECT ON public.game_moves TO authenticated;

-- Step 7: Final status check
SELECT 
  'Setup complete!' as status,
  'Real-time should now work for games table' as message;

-- Instructions for testing:
-- 1. Go to your chess application
-- 2. Open a game in two browser windows
-- 3. Make a move in one window
-- 4. The move should appear instantly in the other window
-- 5. Check browser console for "Real-time update received" messages
