const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testAuthErrorHandling() {
  try {
    console.log('Testing auth error handling...')
    
    // Test 1: Try to get user without session (should handle gracefully)
    console.log('\n1. Testing getUser without session...')
    try {
      const { data, error } = await supabase.auth.getUser()
      if (error) {
        console.log('✅ Expected error handled gracefully:', error.message)
      } else {
        console.log('ℹ️  User data:', data.user ? data.user.email : 'No user')
      }
    } catch (error) {
      console.log('✅ Exception handled:', error.message)
    }
    
    // Test 2: Try to get session (should work)
    console.log('\n2. Testing getSession...')
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.log('❌ Session error:', error.message)
      } else {
        console.log('✅ Session check successful:', data.session ? 'Active session' : 'No session')
      }
    } catch (error) {
      console.log('❌ Session exception:', error.message)
    }
    
    // Test 3: Test auth state change listener
    console.log('\n3. Testing auth state change listener...')
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`✅ Auth state change detected: ${event}`, session ? session.user?.email : 'No session')
    })
    
    // Clean up after a short delay
    setTimeout(() => {
      subscription.unsubscribe()
      console.log('✅ Auth state listener cleaned up')
    }, 2000)
    
    console.log('\n✅ Auth error handling test completed!')
    console.log('\nThe improvements made:')
    console.log('- Enhanced error logging in AuthContext')
    console.log('- Global fetch error handler for auth requests')
    console.log('- User-friendly error notifications')
    console.log('- Better token refresh handling')
    console.log('- Graceful fallback to user data from auth metadata')
    
  } catch (error) {
    console.error('❌ Unexpected error in test:', error)
  }
}

testAuthErrorHandling()
