-- Debug and fix user profile issues
-- Run this in your Supabase SQL editor

-- 1. Check existing auth users and their metadata
SELECT 
  'AUTH USERS' as table_name,
  id,
  email,
  raw_user_meta_data,
  raw_user_meta_data->>'name' as name,
  raw_user_meta_data->>'display_name' as display_name,
  raw_user_meta_data->>'full_name' as full_name,
  raw_user_meta_data->>'given_name' as given_name,
  raw_user_meta_data->>'picture' as picture,
  raw_user_meta_data->>'avatar_url' as avatar_url,
  created_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check existing users in the users table
SELECT 
  'USERS TABLE' as table_name,
  id,
  email,
  display_name,
  avatar_url,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Find auth users that don't have corresponding user records
SELECT 
  'MISSING USER RECORDS' as issue,
  au.id,
  au.email,
  au.created_at as auth_created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- 4. Create missing user records for existing auth users
INSERT INTO users (id, email, display_name, avatar_url)
SELECT 
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'display_name',
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'given_name',
    split_part(au.email, '@', 1)
  ) as display_name,
  COALESCE(
    au.raw_user_meta_data->>'avatar_url',
    au.raw_user_meta_data->>'picture'
  ) as avatar_url
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY tablename, policyname;

-- 6. Test if the trigger function exists and works
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- 7. Check if the trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';
