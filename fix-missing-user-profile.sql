-- Fix Missing User Profile
-- Run this in your Supabase SQL Editor

-- First, let's check if the user exists
SELECT 'Current users in database:' as info;
SELECT id, email, display_name FROM users;

-- Insert the missing user profile
-- Replace the ID and email with your actual values from the debug page
INSERT INTO users (id, email, display_name, avatar_url, created_at, updated_at)
VALUES (
  'a77137bd-9b31-40ef-bc66-ad6551c11245',
  'mbmasterboy123@gmail.com', 
  'Ian Lee',
  'https://lh3.googleusercontent.com/a/ACg8ocIjRn0A-kkxft4itIkCtIELOaBrSPWnJT0TaGIgP6zBBTygcRw=s96-c',
  '2025-07-10T07:33:50.387569Z',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

-- Verify the user was created
SELECT 'User profile created/updated:' as info;
SELECT id, email, display_name, avatar_url FROM users WHERE id = 'a77137bd-9b31-40ef-bc66-ad6551c11245';

-- Also fix the trigger for future users
-- Drop and recreate the user creation trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_display_name TEXT;
  user_avatar_url TEXT;
BEGIN
  -- Extract display name with multiple fallbacks for Google OAuth
  user_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'given_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Extract avatar URL with fallbacks
  user_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture'
  );
  
  -- Ensure display_name is not null or empty
  IF user_display_name IS NULL OR user_display_name = '' THEN
    user_display_name := split_part(NEW.email, '@', 1);
  END IF;
  
  INSERT INTO users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    user_display_name,
    user_avatar_url
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = EXCLUDED.display_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and still return NEW to not break auth
    RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

SELECT 'User creation trigger fixed' as status;
