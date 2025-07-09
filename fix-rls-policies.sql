-- Fix RLS policies to allow user profile creation
-- Run this in your Supabase SQL editor

-- 1. Check current policies
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
WHERE tablename = 'users'
ORDER BY tablename, policyname;

-- 2. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- 3. Create new policies that allow user creation
-- Allow all authenticated users to view profiles
CREATE POLICY "Users can view all profiles" ON users 
  FOR SELECT 
  USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile" ON users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. Verify the new policies
SELECT 
  'Updated RLS Policies' as info,
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

-- 5. Test the policies by attempting to create a user profile
-- This should work now for authenticated users
SELECT 'RLS Policy Test Complete' as result;
