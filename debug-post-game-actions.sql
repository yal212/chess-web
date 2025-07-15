-- Debug script for post-game actions issues
-- Run this in your Supabase SQL Editor to diagnose problems

-- 1. Check if the table exists and its structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'post_game_actions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check constraints on the table
SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'post_game_actions' 
AND table_schema = 'public';

-- 3. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'post_game_actions';

-- 4. Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'post_game_actions' 
AND schemaname = 'public';

-- 5. Check if you can insert a test record (replace with real values)
-- IMPORTANT: Replace 'your-game-id' and 'your-user-id' with actual values from your database
/*
INSERT INTO post_game_actions (game_id, player_id, action) 
VALUES (
  'your-game-id',  -- Replace with a real game ID
  'your-user-id',  -- Replace with a real user ID  
  'play_again'
);
*/

-- 6. Check current user and auth status
SELECT 
  current_user as current_db_user,
  session_user as session_db_user;

-- 7. Check auth.uid() function (this is what RLS policies use)
SELECT auth.uid() as current_auth_user;

-- 8. Check if there are any games and users to test with
SELECT 'Games count: ' || COUNT(*) as games_info FROM games LIMIT 1;
SELECT 'Users count: ' || COUNT(*) as users_info FROM users LIMIT 1;

-- 9. Show a sample game and user for testing
SELECT 
  'Sample game ID: ' || id as sample_game,
  'Status: ' || status as game_status
FROM games 
WHERE status = 'completed'
LIMIT 1;

SELECT 
  'Sample user ID: ' || id as sample_user,
  'Name: ' || display_name as user_name
FROM users 
LIMIT 1;

-- 10. Test if the unique constraint is working
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'post_game_actions' 
AND constraint_type = 'UNIQUE';

-- If you see any errors or unexpected results, that's the source of the problem!
