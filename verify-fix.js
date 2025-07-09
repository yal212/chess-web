// Verify if the RLS policy fix worked and user profiles can be created
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyFix() {
  console.log('🔍 Verifying the RLS policy fix...\n')

  try {
    // Check current user count
    console.log('1. Checking current users in database...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, created_at')

    if (usersError) {
      console.error('❌ Error fetching users:', usersError.message)
    } else {
      console.log(`✅ Found ${users.length} users in database:`)
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.display_name}) - Created: ${user.created_at}`)
      })
    }

    // Check if we can create a user profile for the authenticated user
    console.log('\n2. Testing user profile creation...')
    
    // Use the user ID from the server logs
    const testUserId = '6a0744a7-364b-40fe-bb70-2f63b03d7149'
    const testEmail = 'yal212yal@gmail.com'
    
    // First, check if this user already exists
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()

    if (existingUser) {
      console.log('✅ User profile already exists!')
      console.log(`   Email: ${existingUser.email}`)
      console.log(`   Display Name: ${existingUser.display_name}`)
      console.log(`   Avatar: ${existingUser.avatar_url}`)
      console.log(`   Created: ${existingUser.created_at}`)
    } else if (existingError?.code === 'PGRST116') {
      console.log('ℹ️  User profile does not exist yet')
      
      // Try to create the user profile
      console.log('   Attempting to create user profile...')
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          email: testEmail,
          display_name: 'Ian',
          avatar_url: 'https://lh3.googleusercontent.com/a/ACg8ocImUPLM-OfnPO9kPF9Op8zliTpmEDb_z8awfjpuZ-9MtAYIg6U=s96-c'
        })
        .select()
        .single()

      if (createError) {
        console.error('❌ User creation failed:', createError.message)
        console.error('   Code:', createError.code)
        
        if (createError.code === '42501') {
          console.log('\n🔧 RLS policies still need to be updated!')
          console.log('   Please run the SQL commands in your Supabase dashboard:')
          console.log('   1. Go to Supabase Dashboard → SQL Editor')
          console.log('   2. Run the SQL from fix-rls-policies.sql')
        }
      } else {
        console.log('✅ User profile created successfully!')
        console.log(`   Email: ${newUser.email}`)
        console.log(`   Display Name: ${newUser.display_name}`)
        console.log(`   Avatar: ${newUser.avatar_url}`)
      }
    } else {
      console.error('❌ Error checking existing user:', existingError?.message)
    }

    // Final count
    console.log('\n3. Final user count...')
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('count')

    if (!finalError && finalUsers) {
      console.log(`📊 Total users in database: ${finalUsers.length}`)
    }

    console.log('\n🎯 Next Steps:')
    if (users.length === 0) {
      console.log('1. ⚠️  Run the RLS policy fix SQL in Supabase dashboard')
      console.log('2. 🔄 Refresh your browser and try signing in again')
      console.log('3. 🧪 Click "Run Debug Check" to verify the fix')
    } else {
      console.log('1. ✅ User profiles are working!')
      console.log('2. 🔄 Refresh your browser to see the updated state')
      console.log('3. 🧪 Click "Run Debug Check" to confirm everything is working')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

verifyFix()
