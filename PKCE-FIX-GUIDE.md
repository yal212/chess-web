# Fix for PKCE Authentication Error

## Problem
You're getting the error: "invalid request: both auth code and code verifier should be non-empty"

This happens because your Supabase project is configured for PKCE (Proof Key for Code Exchange) flow, but the server-side authentication handling wasn't set up correctly.

## What I've Fixed

### 1. Updated Server-Side Supabase Client (`src/lib/supabase.ts`)
- Changed to use `@supabase/ssr` package properly
- Added proper cookie handling for PKCE flow
- Made the server client creation async

### 2. Added Middleware (`src/middleware.ts`)
- Handles authentication state across requests
- Manages cookies properly for PKCE flow
- Refreshes user sessions automatically

### 3. Improved Auth Callback (`src/app/auth/callback/route.ts`)
- Better error handling for PKCE-specific errors
- More detailed logging for debugging
- Proper response handling

### 4. Enhanced Error Display (`src/app/page.tsx`)
- Shows PKCE-specific error messages
- Better user experience for auth errors

## Next Steps

### Option 1: Test the Current Fix
1. Restart your development server:
   ```bash
   npm run dev
   ```
2. Try signing in with Google OAuth again
3. The PKCE flow should now work correctly

### Option 2: If Still Having Issues - Check Supabase Configuration

Go to your Supabase dashboard and check these settings:

1. **Authentication > Settings**:
   - Make sure "Enable email confirmations" is OFF for testing
   - Check that Google OAuth is properly configured

2. **Authentication > URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback`

3. **Google OAuth Configuration**:
   - In Google Cloud Console, make sure your OAuth app has:
     - Authorized JavaScript origins: `http://localhost:3000`
     - Authorized redirect URIs: `https://vudqdubrlkouxjourunl.supabase.co/auth/v1/callback`

### Option 3: Disable PKCE (Alternative Solution)

If you want to disable PKCE and use the implicit flow instead:

1. Go to Supabase Dashboard > Authentication > Settings
2. Look for "PKCE" or "Flow Type" settings
3. Change from "pkce" to "implicit" if available

## Testing

After applying the fixes:

1. Clear your browser cookies for localhost:3000
2. Try the Google OAuth flow again
3. Check the browser console and server logs for any remaining errors

## Files Changed

- `src/lib/supabase.ts` - Updated server client creation
- `src/middleware.ts` - New middleware for auth handling
- `src/app/auth/callback/route.ts` - Improved callback handling
- `src/app/page.tsx` - Better error display

The main fix is the proper implementation of the SSR package with cookie handling, which is required for PKCE flow to work correctly.
