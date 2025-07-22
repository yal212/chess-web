#!/usr/bin/env node

/**
 * Script to help identify the correct URLs for OAuth configuration
 * Run this script to get the URLs you need to configure in Supabase and Google Cloud Console
 */

console.log('🔍 Deployment URL Configuration Helper\n')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('📋 Current Configuration:')
console.log('─'.repeat(50))
console.log(`Supabase URL: ${supabaseUrl}`)
console.log(`Supabase Anon Key: ${supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'Not set'}`)
console.log('')

console.log('🌐 URLs to Configure:')
console.log('─'.repeat(50))

console.log('\n1. 📱 Vercel Deployment URLs:')
console.log('   You need to find your actual Vercel deployment URL.')
console.log('   Common patterns:')
console.log('   • https://chess-web-[random].vercel.app')
console.log('   • https://[your-project-name].vercel.app')
console.log('   • https://[custom-domain].com (if you have a custom domain)')
console.log('')
console.log('   To find your actual URL:')
console.log('   1. Go to https://vercel.com/dashboard')
console.log('   2. Find your chess_web project')
console.log('   3. Copy the deployment URL')

console.log('\n2. 🔐 Supabase Authentication Settings:')
console.log('   Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/url-configuration')
console.log('')
console.log('   Configure these URLs:')
console.log('   • Site URL: [YOUR_VERCEL_URL]')
console.log('   • Redirect URLs: [YOUR_VERCEL_URL]/auth/callback')
console.log('')
console.log('   Example:')
console.log('   • Site URL: https://chess-web-abc123.vercel.app')
console.log('   • Redirect URLs: https://chess-web-abc123.vercel.app/auth/callback')

console.log('\n3. 🔑 Google Cloud Console Settings:')
console.log('   Go to: https://console.cloud.google.com/apis/credentials')
console.log('')
console.log('   Configure these URLs in your OAuth 2.0 Client:')
console.log('   • Authorized JavaScript origins: [YOUR_VERCEL_URL]')
console.log('   • Authorized redirect URIs: https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback')
console.log('')
console.log('   Example:')
console.log('   • Authorized JavaScript origins: https://chess-web-abc123.vercel.app')
console.log('   • Authorized redirect URIs: https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback')

console.log('\n4. 🚀 Testing:')
console.log('   After configuring the URLs:')
console.log('   1. Deploy your updated code to Vercel')
console.log('   2. Wait 2-3 minutes for changes to propagate')
console.log('   3. Test Google login on your production site')
console.log('   4. Check browser developer tools for any error messages')

console.log('\n💡 Troubleshooting Tips:')
console.log('─'.repeat(50))
console.log('• Make sure all URLs use HTTPS (not HTTP)')
console.log('• Ensure there are no trailing slashes in URLs')
console.log('• Wait a few minutes after making changes for them to take effect')
console.log('• Check browser console for detailed error messages')
console.log('• Verify that Google OAuth is enabled in Supabase dashboard')

console.log('\n✅ Next Steps:')
console.log('1. Find your actual Vercel deployment URL')
console.log('2. Update Supabase authentication settings')
console.log('3. Update Google Cloud Console settings')
console.log('4. Deploy and test')
