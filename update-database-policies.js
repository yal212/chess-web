const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function updatePolicies() {
  try {
    console.log('Adding DELETE policy for games table...')

    // Try to create the policy using a direct SQL query
    const { data, error } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', 'games')
      .eq('policyname', 'Users can delete games they created')

    if (data && data.length > 0) {
      console.log('✅ DELETE policy already exists!')
      return
    }

    console.log('Policy does not exist, you need to add it manually in Supabase dashboard.')
    console.log('Go to: https://supabase.com/dashboard -> SQL Editor')
    console.log('Run this SQL:')
    console.log(`
CREATE POLICY "Users can delete games they created" ON games FOR DELETE USING (
  auth.uid() = white_player_id
);
    `)

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

updatePolicies()
