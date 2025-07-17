const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDatabase() {
  try {
    console.log('Checking database connection and tables...')
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.error('Connection error:', connectionError)
      
      // If users table doesn't exist, that's likely the issue
      if (connectionError.code === '42P01') {
        console.log('\n❌ Users table does not exist!')
        console.log('You need to run the SQL schema in your Supabase dashboard:')
        console.log('1. Go to your Supabase project dashboard')
        console.log('2. Navigate to SQL Editor')
        console.log('3. Copy and paste the contents of supabase-schema.sql')
        console.log('4. Run the SQL commands')
        return
      }
    } else {
      console.log('✅ Successfully connected to Supabase and users table exists')
    }
    
    // Test creating a user profile (this will help us understand the fetchUserProfile error)
    console.log('\nTesting user profile operations...')
    
    // Try to get current user (this should work with service key)
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Auth error:', authError)
    } else {
      console.log(`✅ Found ${authData.users.length} users in auth system`)
      
      if (authData.users.length > 0) {
        const testUser = authData.users[0]
        console.log(`Testing with user: ${testUser.email}`)
        
        // Try to fetch user profile
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', testUser.id)
          .maybeSingle()
        
        if (profileError) {
          console.error('Profile fetch error:', profileError)
        } else if (userProfile) {
          console.log('✅ User profile exists:', userProfile)
        } else {
          console.log('⚠️  User exists in auth but no profile in users table')
        }
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

checkDatabase()
