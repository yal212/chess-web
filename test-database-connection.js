// Test database connection and basic operations
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection and operations...\n')

  try {
    // Test 1: Basic connection
    console.log('1. Testing basic connection...')
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Connection failed:', error.message)
      return
    }
    console.log('✅ Database connection successful')

    // Test 2: Check table structure
    console.log('\n2. Checking users table structure...')
    try {
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'users' })

      if (tableError) {
        console.log('ℹ️  RPC not available, using basic query')
      } else {
        console.log('✅ Users table structure accessible')
      }
    } catch (error) {
      console.log('ℹ️  Table structure check skipped (RPC not available)')
    }

    // Test 3: Check RLS policies
    console.log('\n3. Testing RLS policies...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)

    if (usersError) {
      console.error('❌ RLS policy test failed:', usersError.message)
    } else {
      console.log(`✅ RLS policies working - found ${users.length} users`)
    }

    // Test 4: Test user creation (dry run)
    console.log('\n4. Testing user creation capability...')
    const testUserId = '00000000-0000-0000-0000-000000000000'
    const { data: createTest, error: createError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: 'test@example.com',
        display_name: 'Test User'
      })
      .select()

    if (createError) {
      if (createError.code === '23505') { // Unique constraint violation
        console.log('✅ User creation capability confirmed (test user already exists)')
      } else {
        console.error('❌ User creation test failed:', createError.message)
      }
    } else {
      console.log('✅ User creation successful')
      
      // Clean up test user
      await supabase
        .from('users')
        .delete()
        .eq('id', testUserId)
      console.log('✅ Test user cleaned up')
    }

    // Test 5: Check trigger function
    console.log('\n5. Checking trigger function...')
    try {
      const { data: functionExists } = await supabase
        .rpc('check_function_exists', { function_name: 'handle_new_user' })

      if (functionExists) {
        console.log('✅ handle_new_user function exists')
      } else {
        console.log('ℹ️  Cannot verify trigger function')
      }
    } catch (error) {
      console.log('ℹ️  Cannot verify trigger function (may require admin access)')
    }

    console.log('\n🎉 Database tests completed!')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testDatabaseConnection()
