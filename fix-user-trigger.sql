-- Fix the handle_new_user trigger to properly handle Google OAuth metadata
-- Run this in your Supabase SQL editor

-- Drop the existing trigger and function
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
  );
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
