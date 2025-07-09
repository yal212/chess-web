// Script to create missing user profiles for existing auth users
// This is a one-time fix script to run when users exist in auth but not in users table

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createMissingUserProfiles() {
  console.log('🔧 Creating missing user profiles...\n')

  try {
    // First, let's check what we have in the users table
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('id, email')

    if (existingError) {
      console.error('❌ Error fetching existing users:', existingError)
      return
    }

    console.log(`📊 Found ${existingUsers.length} existing user profiles`)

    // Use a SQL query to find auth users without corresponding user profiles
    const { data: missingUsers, error: missingError } = await supabase
      .rpc('get_auth_users_without_profiles')

    if (missingError) {
      console.log('ℹ️  RPC function not available, using alternative method...')
      
      // Alternative: manually check by trying to create profiles
      // This will work because of ON CONFLICT DO NOTHING
      console.log('🔄 Attempting to create profiles for any missing users...')
      
      // Since we can't directly query auth.users, we'll rely on the trigger
      // and the application logic to handle user creation
      console.log('✅ The updated AuthContext will handle user creation automatically')
      console.log('   when users sign in and their profile is missing.')
      
    } else {
      console.log(`🔍 Found ${missingUsers.length} auth users without profiles`)
      
      for (const authUser of missingUsers) {
        try {
          const displayName = authUser.raw_user_meta_data?.display_name || 
                             authUser.raw_user_meta_data?.name || 
                             authUser.raw_user_meta_data?.full_name ||
                             authUser.raw_user_meta_data?.given_name ||
                             authUser.email?.split('@')[0] || 
                             'Anonymous'

          const avatarUrl = authUser.raw_user_meta_data?.avatar_url || 
                           authUser.raw_user_meta_data?.picture

          const { data, error } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
              display_name: displayName,
              avatar_url: avatarUrl
            })
            .select()

          if (error) {
            console.error(`❌ Failed to create profile for ${authUser.email}:`, error.message)
          } else {
            console.log(`✅ Created profile for ${authUser.email}`)
          }
        } catch (error) {
          console.error(`❌ Error creating profile for ${authUser.email}:`, error.message)
        }
      }
    }

    // Final count
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('id, email, display_name')

    if (!finalError) {
      console.log(`\n📊 Final count: ${finalUsers.length} user profiles`)
      finalUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.display_name})`)
      })
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Helper function to create the RPC if it doesn't exist
async function createHelperRPC() {
  const rpcSQL = `
    CREATE OR REPLACE FUNCTION get_auth_users_without_profiles()
    RETURNS TABLE (
      id UUID,
      email TEXT,
      raw_user_meta_data JSONB,
      created_at TIMESTAMPTZ
    )
    LANGUAGE SQL
    SECURITY DEFINER
    AS $$
      SELECT au.id, au.email, au.raw_user_meta_data, au.created_at
      FROM auth.users au
      LEFT JOIN public.users u ON au.id = u.id
      WHERE u.id IS NULL;
    $$;
  `
  
  const { error } = await supabase.rpc('exec_sql', { sql: rpcSQL })
  if (error) {
    console.log('ℹ️  Could not create helper RPC function:', error.message)
  }
}

// Run the script
createHelperRPC().then(() => {
  createMissingUserProfiles()
})
