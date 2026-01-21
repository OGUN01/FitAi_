/**
 * Get Supabase Auth Token
 *
 * This script authenticates with Supabase and returns a valid JWT token
 * for testing authenticated endpoints.
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
	throw new Error('SUPABASE_URL environment variable is required');
}
if (!SUPABASE_ANON_KEY) {
	throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

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
