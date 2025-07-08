-- Debug script to check what metadata Google OAuth is providing
-- Run this in your Supabase SQL editor to see the raw metadata

-- Check existing auth users and their metadata
SELECT 
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
LIMIT 5;

-- Check if there are any users in the users table
SELECT 
  id,
  email,
  display_name,
  avatar_url,
  created_at
FROM users 
ORDER BY created_at DESC 
LIMIT 5;
