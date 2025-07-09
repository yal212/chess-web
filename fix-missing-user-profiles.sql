-- Fix missing user profiles
-- Run this in your Supabase SQL editor to create user profiles for existing auth users

-- 1. First, let's see what we're working with
SELECT 'Current state' as info;

-- Count auth users
SELECT 
  'auth.users count' as table_name,
  COUNT(*) as count
FROM auth.users;

-- Count user profiles
SELECT 
  'users count' as table_name,
  COUNT(*) as count
FROM users;

-- 2. Find auth users without corresponding user profiles
SELECT 
  'Missing user profiles' as info,
  au.id,
  au.email,
  au.raw_user_meta_data,
  au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- 3. Create missing user profiles
INSERT INTO users (id, email, display_name, avatar_url)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'given_name',
    split_part(au.email, '@', 1),
    'Anonymous'
  ) as display_name,
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ) as avatar_url
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = COALESCE(EXCLUDED.display_name, users.display_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
  updated_at = NOW();

-- 4. Verify the fix
SELECT 
  'After fix - users count' as table_name,
  COUNT(*) as count
FROM users;

-- 5. Show all user profiles
SELECT 
  'All user profiles' as info,
  id,
  email,
  display_name,
  avatar_url,
  created_at
FROM users
ORDER BY created_at DESC;

-- 6. Verify the trigger is working
SELECT 
  'Trigger status' as info,
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 7. Check if the function exists
SELECT 
  'Function status' as info,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';
