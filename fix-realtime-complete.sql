-- Complete fix for Supabase real-time issues
-- Run this in your Supabase SQL Editor

-- Step 1: Check current real-time publication status
SELECT 
  schemaname, 
  tablename,
  'Current publication status' as info
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Step 2: Enable real-time for games table
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- Step 3: Enable real-time for game_moves table (if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_moves;

-- Step 4: Verify real-time is now enabled
SELECT 
  schemaname, 
  tablename,
  'After enabling real-time' as info
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('games', 'game_moves');

-- Step 5: Check RLS policies that might block real-time
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'games' 
AND schemaname = 'public';

-- Step 6: Create a more permissive RLS policy for real-time if needed
-- (Only if the existing policies are too restrictive)

-- First, drop the policy if it exists, then recreate it
DROP POLICY IF EXISTS "Allow authenticated users to see game updates" ON games;

-- Create a policy that allows authenticated users to see game updates
-- This is needed for real-time to work properly
CREATE POLICY "Allow authenticated users to see game updates"
ON games FOR SELECT
USING (auth.role() = 'authenticated');

-- Step 7: Ensure the games table has proper permissions
GRANT SELECT ON public.games TO authenticated;
GRANT SELECT ON public.games TO anon;

-- Step 8: Test query to verify access
-- This should return games if the user has access
SELECT 
  'Testing game access' as test,
  count(*) as game_count
FROM public.games;

-- Step 9: Check if real-time is working by creating a test trigger
-- This will help us verify that changes are being detected

CREATE OR REPLACE FUNCTION test_realtime_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the change for debugging
  RAISE LOG 'Real-time trigger fired: % on table %', TG_OP, TG_TABLE_NAME;
  
  -- For INSERT/UPDATE, return NEW
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for testing (can be removed later)
DROP TRIGGER IF EXISTS test_realtime_games_trigger ON public.games;
CREATE TRIGGER test_realtime_games_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.games
  FOR EACH ROW EXECUTE FUNCTION test_realtime_trigger();

-- Step 10: Final verification
SELECT 
  'Real-time setup completed!' as status,
  'Check Supabase logs for trigger messages when games are updated' as note;

-- Step 11: Instructions for testing
SELECT 
  'To test real-time:' as instruction,
  '1. Make a change to a game record' as step1,
  '2. Check browser console for real-time events' as step2,
  '3. Check Supabase logs for trigger messages' as step3;
