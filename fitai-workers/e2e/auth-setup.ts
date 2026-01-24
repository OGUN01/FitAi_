/**
 * Authentication setup for Playwright tests
 * Gets a valid JWT token from Supabase
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const SUPABASE_ANON_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08';

export async function getAuthToken(email: string, password: string): Promise<string | null> {
	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) {
		console.error('Auth error:', error.message);
		return null;
	}

	return data.session?.access_token || null;
}

// CLI usage
if (require.main === module) {
	const email = process.argv[2] || 'sharmaharsh9887@gmail.com';
	const password = process.argv[3] || 'Harsh@9887';

	getAuthToken(email, password).then((token) => {
		if (token) {
			console.log('TOKEN:', token);
		} else {
			console.error('Failed to get token');
			process.exit(1);
		}
	});
}
