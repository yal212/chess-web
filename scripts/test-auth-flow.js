const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAuthFlow() {
  try {
    console.log('Testing authentication flow...')
    
    // Get all auth users and their profiles
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }
    
    const { data: profiles, error: profilesError } = await supabase
      .from('users')
      .select('*')
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return
    }
    
    console.log(`\n📊 Auth System Status:`)
    console.log(`   Auth users: ${authData.users.length}`)
    console.log(`   User profiles: ${profiles.length}`)
    
    // Check if all auth users have profiles
    const authUserIds = new Set(authData.users.map(u => u.id))
    const profileIds = new Set(profiles.map(p => p.id))
    
    const missingProfiles = authData.users.filter(u => !profileIds.has(u.id))
    const orphanedProfiles = profiles.filter(p => !authUserIds.has(p.id))
    
    if (missingProfiles.length === 0 && orphanedProfiles.length === 0) {
      console.log('✅ All auth users have corresponding profiles!')
    } else {
      if (missingProfiles.length > 0) {
        console.log(`⚠️  ${missingProfiles.length} auth users missing profiles:`)
        missingProfiles.forEach(u => console.log(`   - ${u.email}`))
      }
      if (orphanedProfiles.length > 0) {
        console.log(`⚠️  ${orphanedProfiles.length} orphaned profiles:`)
        orphanedProfiles.forEach(p => console.log(`   - ${p.email}`))
      }
    }
    
    // Display user details
    console.log('\n👥 User Details:')
    profiles.forEach(profile => {
      const authUser = authData.users.find(u => u.id === profile.id)
      console.log(`   ${profile.email}:`)
      console.log(`     Display Name: ${profile.display_name}`)
      console.log(`     Avatar: ${profile.avatar_url ? 'Yes' : 'No'}`)
      console.log(`     Auth Created: ${authUser?.created_at}`)
      console.log(`     Profile Created: ${profile.created_at}`)
      console.log('')
    })
    
    console.log('✅ Authentication flow test completed!')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

testAuthFlow()
