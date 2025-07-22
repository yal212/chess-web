# Fix for Google OAuth Database Error

## Problem
You're getting a "Database error saving new user" error when signing in with Google OAuth. This happens because the database trigger that creates user records is not properly handling the metadata structure from Google OAuth.

## Solution Steps

### 1. Apply the Database Fix

1. Go to your Supabase dashboard: https://YOUR_PROJECT_ID.supabase.co
2. Navigate to the SQL Editor
3. Copy and paste the contents of `fix-user-trigger.sql` into the SQL editor
4. Run the query

This will:
- Drop the existing problematic trigger
- Create a new, more robust trigger that handles Google OAuth metadata properly
- Add error handling so authentication doesn't fail even if user creation has issues

### 2. Debug (Optional)

If you want to see what metadata Google is providing, run the `debug-auth-metadata.sql` script in the Supabase SQL editor. This will show you:
- What metadata Google OAuth is sending
- Whether users are being created in the users table

### 3. Test the Fix

1. Try signing in with Google OAuth again
2. The error should be resolved
3. Check your Supabase users table to confirm the user record was created

## What Was Fixed

The original trigger was failing because:
1. Google OAuth metadata uses different field names than expected (`picture` instead of `avatar_url`, etc.)
2. No fallback handling if the expected fields were missing
3. No error handling, so any database error would break the entire authentication flow

The new trigger:
- Checks multiple possible field names for display name and avatar
- Has proper fallbacks to ensure required fields are never null
- Includes error handling so authentication continues even if user creation fails
- Logs errors for debugging

## Files Changed

- `supabase-schema.sql` - Updated with the improved trigger
- `src/app/auth/callback/route.ts` - Better error handling and logging
- `src/app/page.tsx` - Display authentication errors to users
- `fix-user-trigger.sql` - Migration script to apply the fix
- `debug-auth-metadata.sql` - Debug script to inspect OAuth metadata
