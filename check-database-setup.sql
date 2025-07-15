-- Quick check to see if post-game features are set up
-- Run this in your Supabase SQL Editor to check the current state

-- Check if post_game_actions table exists
SELECT 
  'post_game_actions table exists: ' || 
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'post_game_actions' AND table_schema = 'public'
  ) THEN 'YES' ELSE 'NO' END as table_status;

-- Check if new columns exist in games table
SELECT 
  'result_reason column exists: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'result_reason' AND table_schema = 'public'
  ) THEN 'YES' ELSE 'NO' END as result_reason_status;

SELECT 
  'completed_at column exists: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'games' AND column_name = 'completed_at' AND table_schema = 'public'
  ) THEN 'YES' ELSE 'NO' END as completed_at_status;

-- Check if real-time is enabled for post_game_actions
SELECT 
  'post_game_actions real-time enabled: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'post_game_actions'
  ) THEN 'YES' ELSE 'NO' END as realtime_status;

-- Check if cleanup function exists
SELECT 
  'cleanup_old_completed_games function exists: ' ||
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'cleanup_old_completed_games' AND routine_schema = 'public'
  ) THEN 'YES' ELSE 'NO' END as function_status;

-- Show current RLS policies for post_game_actions (if table exists)
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual
FROM pg_policies 
WHERE tablename = 'post_game_actions' 
AND schemaname = 'public';

-- If everything shows 'NO', you need to run the migration script
-- If some show 'YES' and others 'NO', you may have a partial migration
