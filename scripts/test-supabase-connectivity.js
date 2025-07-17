const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

console.log('Testing Supabase connectivity...')
console.log('Supabase URL:', supabaseUrl)
console.log('Anon Key:', supabaseAnonKey.substring(0, 20) + '...')

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnectivity() {
  try {
    console.log('\n1. Testing basic connection...')
    
    // Test basic connection with a simple query
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('❌ Basic connection failed:', error)
    } else {
      console.log('✅ Basic connection successful')
    }
    
    console.log('\n2. Testing auth endpoint...')
    
    // Test auth endpoint specifically
    const { data: session, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('❌ Auth session check failed:', sessionError)
    } else {
      console.log('✅ Auth endpoint accessible')
      console.log('Current session:', session.session ? 'Active' : 'None')
    }
    
    console.log('\n3. Testing auth user endpoint...')
    
    // Test getting user (this might trigger token refresh)
    const { data: user, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('❌ Auth user check failed:', userError)
    } else {
      console.log('✅ Auth user endpoint accessible')
      console.log('Current user:', user.user ? user.user.email : 'None')
    }
    
    console.log('\n4. Testing direct HTTP request to Supabase...')
    
    // Test direct HTTP request to see if it's a network issue
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/users?select=count&limit=1`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      })
      
      if (response.ok) {
        console.log('✅ Direct HTTP request successful')
      } else {
        console.error('❌ Direct HTTP request failed:', response.status, response.statusText)
      }
    } catch (fetchError) {
      console.error('❌ Direct HTTP request failed with fetch error:', fetchError.message)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testConnectivity()
