// Debug script to test user profile fetching
// Run with: node debug-user-profile.js

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugUserProfiles() {
  console.log('🔍 Debugging user profiles...\n')

  try {
    // Check auth users using RPC call since auth.users is not directly accessible
    console.log('1. Checking current authenticated user:')
    const { data: currentUser, error: currentUserError } = await supabase.auth.getUser()

    if (currentUserError) {
      console.error('❌ Error getting current user:', currentUserError)
    } else if (currentUser.user) {
      console.log('✅ Current authenticated user:')
      console.log(`  - ${currentUser.user.email} (${currentUser.user.id})`)
      console.log(`    Metadata:`, currentUser.user.user_metadata)
    } else {
      console.log('ℹ️  No authenticated user')
    }



    console.log('\n2. Checking users table:')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      console.log(`✅ Found ${users.length} users in users table:`)
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`)
        console.log(`    Display name: ${user.display_name}`)
        console.log(`    Avatar: ${user.avatar_url}`)
      })
    }

    // Check RLS policies
    console.log('\n3. Testing RLS policies:')
    const { data: rlsTest, error: rlsError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (rlsError) {
      console.error('❌ RLS policy test failed:', rlsError)
    } else {
      console.log('✅ RLS policies allow reading users table')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

debugUserProfiles()
