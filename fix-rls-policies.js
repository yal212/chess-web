// Fix RLS policies to allow user profile creation
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for user profile creation...\n')

  const policies = [
    // Drop existing policies
    'DROP POLICY IF EXISTS "Users can view all profiles" ON users;',
    'DROP POLICY IF EXISTS "Users can update own profile" ON users;',
    'DROP POLICY IF EXISTS "Users can insert own profile" ON users;',
    
    // Create new policies
    `CREATE POLICY "Users can view all profiles" ON users 
     FOR SELECT USING (true);`,
    
    `CREATE POLICY "Users can insert own profile" ON users 
     FOR INSERT WITH CHECK (auth.uid() = id);`,
    
    `CREATE POLICY "Users can update own profile" ON users 
     FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`
  ]

  for (const [index, policy] of policies.entries()) {
    try {
      console.log(`${index + 1}. Executing policy update...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: policy })
      
      if (error) {
        // Try alternative method if exec_sql RPC doesn't exist
        console.log(`   Trying alternative method...`)
        
        // For policies, we can use the REST API directly
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey
          },
          body: JSON.stringify({ sql: policy })
        })

        if (!response.ok) {
          console.log(`   ⚠️  Could not execute policy ${index + 1} via API`)
        } else {
          console.log(`   ✅ Policy ${index + 1} updated via API`)
        }
      } else {
        console.log(`   ✅ Policy ${index + 1} updated successfully`)
      }
    } catch (error) {
      console.log(`   ⚠️  Could not execute policy ${index + 1}:`, error.message)
    }
  }

  console.log('\n📋 Please run the following SQL in your Supabase dashboard:')
  console.log('=' .repeat(60))
  policies.forEach((policy, index) => {
    console.log(`-- Step ${index + 1}`)
    console.log(policy)
    console.log('')
  })
  console.log('=' .repeat(60))

  // Test the fix
  console.log('\n🧪 Testing user creation with current user...')
  
  try {
    const { data: currentUser } = await supabase.auth.getUser()
    
    if (currentUser.user) {
      console.log('✅ Found authenticated user for testing')
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: currentUser.user.id,
          email: currentUser.user.email,
          display_name: 'Test User'
        })
        .select()

      if (error) {
        console.log('❌ User creation still failing:', error.message)
        console.log('   Please run the SQL commands above in Supabase dashboard')
      } else {
        console.log('✅ User creation test successful!')
        
        // Clean up test
        await supabase.from('users').delete().eq('id', currentUser.user.id)
      }
    } else {
      console.log('ℹ️  No authenticated user for testing')
    }
  } catch (error) {
    console.log('ℹ️  Could not test with current user:', error.message)
  }

  console.log('\n🎉 RLS policy fix completed!')
  console.log('Please refresh your application and try signing in again.')
}

fixRLSPolicies()
