# Authentication Testing Guide

## Current Status
✅ **Authentication is working** - OAuth flow is successful
✅ **User profile creation is working** - Users are being created in the database
✅ **Enhanced debugging is in place** - Debug panel shows detailed auth info

## Testing Different Account Scenarios

### Scenario 1: Sign in with the same Google account
1. Open http://localhost:3002
2. Click "Sign in with Google"
3. Choose your primary Google account
4. ✅ Should work without issues

### Scenario 2: Sign in with a different Google account
1. **First, sign out completely:**
   - Click your profile picture → Sign Out
   - OR clear browser cookies for localhost:3002
   
2. **Sign in with a different Google account:**
   - Click "Sign in with Google"
   - Choose a different Google account (or add a new one)
   - Watch the debug panel for any errors

### Scenario 3: Switch between accounts
1. Sign in with Account A
2. Sign out
3. Sign in with Account B
4. Check debug panel for "Different user account detected" message

## What to Look For

### In the Browser Console:
- Any error messages related to user profile creation
- Database constraint violations
- Network request failures

### In the Debug Panel (Development Mode):
- Auth Context State showing correct user info
- Recent Auth Logs showing any errors
- Debug Results from "Run Debug Check" button

### In the Terminal (Server Logs):
- "User authenticated successfully" messages
- "Different user account detected" messages
- Any error messages about user profile creation

## Common Issues and Solutions

### Issue 1: User Profile Creation Fails
**Symptoms:** User signs in but profile doesn't load
**Check:** Debug panel shows `hasSupabaseUser: true` but `hasUser: false`
**Solution:** Check database constraints, email uniqueness

### Issue 2: Account Switching Problems
**Symptoms:** Previous user data persists when switching accounts
**Check:** Browser cookies, session storage
**Solution:** Clear browser data or implement proper sign-out

### Issue 3: OAuth Configuration Issues
**Symptoms:** Redirect errors, invalid client errors
**Check:** Supabase dashboard OAuth settings
**Solution:** Verify redirect URLs match exactly

## Debugging Steps

1. **Open Browser Developer Tools** (F12)
2. **Go to Console tab** to see client-side errors
3. **Go to Network tab** to see failed requests
4. **Use the Debug Panel** on the homepage (development mode only)
5. **Check Terminal** for server-side logs

## Expected Behavior

When switching between different Google accounts:
1. OAuth should complete successfully
2. User profile should be created/fetched from database
3. UI should update to show the new user's information
4. No error messages should appear

## If You Find an Error

Please provide:
1. **Browser console logs** (copy/paste any error messages)
2. **Debug panel information** (screenshot or copy/paste)
3. **Terminal server logs** (copy/paste relevant lines)
4. **Steps to reproduce** the exact sequence that causes the error
5. **Which Google accounts** you're switching between (just mention if they're different, don't share personal info)

## Next Steps

Once you've tested these scenarios, we can:
1. Identify the specific error that occurs
2. Implement a targeted fix
3. Test the solution thoroughly
4. Ensure it works for all account switching scenarios
