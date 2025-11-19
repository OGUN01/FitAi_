/**
 * Helper Script to Get Supabase JWT Token
 *
 * This script helps you get a valid JWT token for testing.
 *
 * Methods:
 * 1. Sign in with existing user credentials
 * 2. Create a new test user and get token
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Error: Missing environment variables');
  console.log('\nPlease set:');
  console.log('  SUPABASE_URL=https://your-project.supabase.co');
  console.log('  SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Method 1: Sign in with existing user
 */
async function signInWithEmail(email, password) {
  console.log('\n=== Signing in with email ===');
  console.log('Email:', email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('❌ Sign-in failed:', error.message);
    return null;
  }

  console.log('✅ Sign-in successful!');
  console.log('\nUser ID:', data.user.id);
  console.log('Email:', data.user.email);
  console.log('\n=== JWT ACCESS TOKEN ===');
  console.log(data.session.access_token);
  console.log('\nToken expires at:', new Date(data.session.expires_at * 1000).toISOString());
  console.log('\nCopy the token above and use it to test the workout generation endpoint.');

  return data.session.access_token;
}

/**
 * Method 2: Create a new test user
 */
async function createTestUser(email, password) {
  console.log('\n=== Creating new test user ===');
  console.log('Email:', email);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error('❌ Sign-up failed:', error.message);
    return null;
  }

  console.log('✅ User created successfully!');
  console.log('\nUser ID:', data.user.id);
  console.log('Email:', data.user.email);

  if (data.session) {
    console.log('\n=== JWT ACCESS TOKEN ===');
    console.log(data.session.access_token);
    console.log('\nToken expires at:', new Date(data.session.expires_at * 1000).toISOString());
    console.log('\nCopy the token above and use it to test the workout generation endpoint.');
    return data.session.access_token;
  } else {
    console.log('\n⚠️  Email confirmation required. Check your email to confirm your account.');
    console.log('After confirmation, run this script again with the sign-in option.');
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║           FitAI Workers - Get JWT Token Helper              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'signin') {
    const email = args[1];
    const password = args[2];

    if (!email || !password) {
      console.error('\n❌ Error: Missing email or password');
      console.log('\nUsage:');
      console.log('  node get-jwt-token.js signin your@email.com yourpassword');
      process.exit(1);
    }

    await signInWithEmail(email, password);
  } else if (command === 'signup') {
    const email = args[1];
    const password = args[2];

    if (!email || !password) {
      console.error('\n❌ Error: Missing email or password');
      console.log('\nUsage:');
      console.log('  node get-jwt-token.js signup test@example.com password123');
      process.exit(1);
    }

    await createTestUser(email, password);
  } else {
    console.log('\n📖 Usage:\n');
    console.log('1. Sign in with existing user:');
    console.log('   node get-jwt-token.js signin your@email.com yourpassword\n');
    console.log('2. Create new test user:');
    console.log('   node get-jwt-token.js signup test@example.com password123\n');
    console.log('3. Alternative: Get token from Supabase Dashboard:');
    console.log('   Dashboard > Authentication > Users > [User] > Copy Access Token\n');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
