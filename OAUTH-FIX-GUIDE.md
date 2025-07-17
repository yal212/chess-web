# 🔧 Google OAuth Fix Guide

## Problem Identified
Your Google OAuth is failing because of a **hardcoded redirect URL mismatch**. The code was pointing to `https://custom-chess-web.vercel.app/auth/callback` but your actual deployment URL is likely different.

## ✅ What I Fixed
1. **Removed hardcoded URL** in `src/contexts/AuthContext.tsx`
2. **Made redirect URL dynamic** - now uses `window.location.origin` 
3. **Added logging** to help debug OAuth flow

## 🚀 Steps to Complete the Fix

### Step 1: Deploy the Updated Code
```bash
# Commit and push the changes
git add .
git commit -m "Fix Google OAuth redirect URL - remove hardcoded domain"
git push origin main
```

### Step 2: Find Your Actual Vercel URL
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your `chess_web` project
3. Copy the deployment URL (e.g., `https://chess-web-xyz123.vercel.app`)

### Step 3: Update Supabase Authentication Settings
1. Go to [Supabase Auth Settings](https://supabase.com/dashboard/project/vudqdubrlkouxjourunl/auth/url-configuration)
2. Update these fields:
   - **Site URL**: `https://your-actual-vercel-url.vercel.app`
   - **Redirect URLs**: `https://your-actual-vercel-url.vercel.app/auth/callback`

### Step 4: Update Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Find your OAuth 2.0 Client ID
3. Update these settings:
   - **Authorized JavaScript origins**: `https://your-actual-vercel-url.vercel.app`
   - **Authorized redirect URIs**: `https://vudqdubrlkouxjourunl.supabase.co/auth/v1/callback`

### Step 5: Test the Fix
1. Wait 2-3 minutes for changes to propagate
2. Go to your production site
3. Try logging in with Google
4. Check browser console for any error messages

## 🔍 Debugging Tips

### If you still get localhost redirects:
- Clear your browser cache and cookies
- Try in an incognito/private window
- Check that you updated the correct OAuth client in Google Cloud Console

### If you get "redirect_uri_mismatch" error:
- Double-check that the URLs in Google Cloud Console exactly match your Vercel URL
- Ensure there are no trailing slashes
- Make sure you're using HTTPS, not HTTP

### If authentication still fails:
- Check the browser console for detailed error messages
- Verify that Google OAuth is enabled in your Supabase dashboard
- Ensure your Google Cloud project has the Google+ API enabled

## 📋 Quick Checklist
- [ ] Code deployed to Vercel
- [ ] Found actual Vercel deployment URL
- [ ] Updated Supabase Site URL
- [ ] Updated Supabase Redirect URLs
- [ ] Updated Google Cloud Console JavaScript origins
- [ ] Updated Google Cloud Console redirect URIs
- [ ] Tested login on production site

## 🆘 If You Need Help
Run this command to get your configuration details:
```bash
node scripts/check-deployment-urls.js
```

The fix should resolve both the localhost redirect issue and the Google OAuth authentication problem!

## 📧 Email Authentication Setup

I've also added comprehensive email authentication! Here's what's new:

### New Authentication Features:
- ✅ **Separate Sign-In and Sign-Up pages** with clear instructions
- ✅ **Email/password authentication** alongside Google OAuth
- ✅ **Password reset functionality** with secure email links
- ✅ **Email verification** for new accounts
- ✅ **Modern UI** with helpful guidance and error handling

### Email Authentication Configuration:
1. **Enable Email Auth in Supabase:**
   - Go to [Supabase Auth Settings](https://supabase.com/dashboard/project/vudqdubrlkouxjourunl/auth/providers)
   - Ensure "Email" provider is enabled
   - Configure email templates if desired

2. **Test the New Features:**
   - Visit `/auth/signin` for the new sign-in page
   - Visit `/auth/signup` for the new sign-up page
   - Try both Google and email authentication methods

### New Pages Available:
- `/auth/signin` - Sign in with Google or email
- `/auth/signup` - Create account with Google or email
- `/auth/forgot-password` - Reset password via email
- `/auth/reset-password` - Set new password (from email link)

The authentication system now provides a complete, user-friendly experience with clear instructions and multiple sign-in options!
