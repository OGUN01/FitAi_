// Auth Debug Test Script
// Run this to test authentication flow: node test-auth-debug.js

const { createClient } = require('@supabase/supabase-js')

// Your Supabase credentials (replace with your actual values)
const supabaseUrl = 'YOUR_SUPABASE_URL'
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAuth() {
  console.log('🔐 Starting auth debug test...\n')
  
  // Test user credentials
  const testEmail = 'test@example.com'
  const testPassword = 'TestPassword123!'
  
  try {
    console.log('1️⃣ Testing signup...')
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    })
    
    if (signupError) {
      console.log('❌ Signup error:', signupError.message)
    } else {
      console.log('✅ Signup successful')
      console.log('   User ID:', signupData.user?.id)
      console.log('   Email confirmed:', signupData.user?.email_confirmed_at !== null)
      console.log('   Session exists:', signupData.session !== null)
    }
    
    console.log('\n2️⃣ Testing login with same credentials...')
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    })
    
    if (loginError) {
      console.log('❌ Login error:', loginError.message)
      console.log('   Error code:', loginError.status)
      console.log('   Error name:', loginError.name)
    } else {
      console.log('✅ Login successful')
      console.log('   User ID:', loginData.user?.id)
      console.log('   Email confirmed:', loginData.user?.email_confirmed_at !== null)
      console.log('   Session exists:', loginData.session !== null)
    }
    
    // Clean up - try to delete the test user
    console.log('\n3️⃣ Cleaning up test user...')
    if (signupData.user?.id) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(signupData.user.id)
      if (deleteError) {
        console.log('⚠️  Could not delete test user:', deleteError.message)
      } else {
        console.log('✅ Test user cleaned up')
      }
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message)
  }
}

// Alternative: Test with existing user
async function testExistingUser() {
  console.log('🔐 Testing with existing user...\n')
  
  // Replace with an actual email from your database
  const existingEmail = 'shharsh41@gmail.com'
  const password = 'YOUR_PASSWORD_HERE' // You'll need to know this
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: existingEmail,
      password: password,
    })
    
    if (error) {
      console.log('❌ Login failed:', error.message)
      console.log('   This confirms the password issue')
    } else {
      console.log('✅ Login successful with existing user')
    }
  } catch (error) {
    console.log('❌ Unexpected error:', error.message)
  }
}

// Run the test
testAuth()

console.log('\n📝 To use this script:')
console.log('1. Replace YOUR_SUPABASE_URL and YOUR_SUPABASE_ANON_KEY with your actual values')
console.log('2. Run: node test-auth-debug.js')
console.log('3. Check the output to see what happens during signup vs login')