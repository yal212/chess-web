// Simple test script to check Supabase auth configuration
// Run with: node test-auth.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://vudqdubrlkouxjourunl.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1ZHFkdWJybGtvdXhqb3VydW5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NzAwMzUsImV4cCI6MjA2NzU0NjAzNX0.js_x0OP2NOfxk3WccYDf7JwZzgSRArTIdbegxRbRJXU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Error getting session:', error)
    } else {
      console.log('✓ Supabase connection successful')
    }
    
    // Check auth settings
    const { data: settings, error: settingsError } = await supabase.auth.getSettings()
    if (settingsError) {
      console.error('Error getting auth settings:', settingsError)
    } else {
      console.log('Auth settings:', settings)
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testAuth()
