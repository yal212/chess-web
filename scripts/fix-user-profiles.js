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

async function fixUserProfiles() {
  try {
    console.log('Fixing missing user profiles...')
    
    // Get all auth users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return
    }
    
    console.log(`Found ${authData.users.length} users in auth system`)
    
    // Get all existing user profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('users')
      .select('id')
    
    if (profilesError) {
      console.error('Error fetching existing profiles:', profilesError)
      return
    }
    
    const existingProfileIds = new Set(existingProfiles.map(p => p.id))
    console.log(`Found ${existingProfiles.length} existing user profiles`)
    
    // Find users without profiles
    const usersWithoutProfiles = authData.users.filter(user => !existingProfileIds.has(user.id))
    console.log(`Found ${usersWithoutProfiles.length} users without profiles`)
    
    // Create profiles for users without them
    for (const user of usersWithoutProfiles) {
      console.log(`Creating profile for ${user.email}...`)
      
      const displayName = user.user_metadata?.display_name ||
                         user.user_metadata?.name ||
                         user.user_metadata?.full_name ||
                         user.user_metadata?.given_name ||
                         user.email?.split('@')[0] ||
                         'Anonymous'
      
      const avatarUrl = user.user_metadata?.avatar_url ||
                       user.user_metadata?.picture
      
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          display_name: displayName,
          avatar_url: avatarUrl,
          created_at: user.created_at,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (error) {
        console.error(`Error creating profile for ${user.email}:`, error)
      } else {
        console.log(`✅ Created profile for ${user.email}`)
      }
    }
    
    console.log('User profile fix completed!')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

fixUserProfiles()
