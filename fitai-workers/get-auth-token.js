/**
 * Get Supabase Auth Token
 *
 * This script authenticates with Supabase and returns a valid JWT token
 * for testing authenticated endpoints.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08';

async function getAuthToken() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('❌ Missing credentials');
    console.log('Usage: node get-auth-token.js <email> <password>');
    process.exit(1);
  }

  try {
    console.log('🔐 Authenticating with Supabase...');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('❌ Authentication failed:', error.message);
      process.exit(1);
    }

    if (!data.session) {
      console.error('❌ No session created');
      process.exit(1);
    }

    console.log('\n✅ Authentication successful!\n');
    console.log('📋 Token Details:');
    console.log('   User ID:', data.user.id);
    console.log('   Email:', data.user.email);
    console.log('   Token expires:', new Date(data.session.expires_at * 1000).toISOString());
    console.log('\n🔑 Access Token:');
    console.log(data.session.access_token);
    console.log('\n📝 Copy this token for testing authenticated endpoints');

    return data.session.access_token;
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getAuthToken();
