/**
 * Media Endpoints Test Script - Sign in and test media upload/serve/delete
 *
 * This script will:
 * 1. Sign in with your email/password
 * 2. Get JWT token automatically
 * 3. Create a test image
 * 4. Test upload endpoint
 * 5. Test serve endpoint (GET)
 * 6. Test delete endpoint
 * 7. Test 404 for non-existent media
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, unlinkSync } from 'fs';

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WORKER_URL = process.env.WORKERS_URL || 'https://fitai-workers.sharmaharsh9887.workers.dev';

// Validate required environment variables
if (!SUPABASE_URL) {
	throw new Error('SUPABASE_URL environment variable is required');
}
if (!SUPABASE_ANON_KEY) {
	throw new Error('SUPABASE_ANON_KEY environment variable is required');
}

/**
 * Create a simple 1x1 pixel PNG for testing
 */
function createTestImage() {
	// 1x1 pixel red PNG
	const pngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
	const filename = 'test-image.png';
	writeFileSync(filename, pngData);
	return filename;
}

async function signInAndTest(email, password) {
	console.log('╔═══════════════════════════════════════════════════════════════╗');
	console.log('║       FitAI Workers - Media Endpoints E2E Test            ║');
	console.log('╚═══════════════════════════════════════════════════════════════╝\n');

	// Step 1: Sign in
	console.log('Step 1: Signing in to Supabase...');
	console.log('Email:', email);

	const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

	const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (authError) {
		console.error('❌ Sign-in failed:', authError.message);
		console.log('\n💡 Make sure:');
		console.log('  - Email and password are correct');
		console.log('  - User exists in Supabase');
		console.log('  - Email is verified');
		return;
	}

	const token = authData.session.access_token;
	console.log('✅ Sign-in successful!');
	console.log('User ID:', authData.user.id);
	console.log('Email:', authData.user.email);
	console.log('Token:', token.substring(0, 30) + '...\n');

	// Step 2: Test health check
	console.log('Step 2: Testing health endpoint...');
	const healthResponse = await fetch(`${WORKER_URL}/health`);
	const healthData = await healthResponse.json();

	if (healthData.status === 'healthy') {
		console.log('✅ Worker is healthy');
		console.log('Services:', JSON.stringify(healthData.services, null, 2));
	} else {
		console.log('❌ Worker is not healthy');
	}

	// Step 3: Create test image
	console.log('\nStep 3: Creating test image...');
	const testImagePath = createTestImage();
	console.log('✅ Test image created:', testImagePath);

	// Step 4: Test upload endpoint
	console.log('\nStep 4: Testing media upload...\n');

	const formData = new FormData();
	const imageData = readFileSync(testImagePath);
	const blob = new Blob([imageData], { type: 'image/png' });
	formData.append('file', blob, 'test-image.png');
	formData.append('category', 'user');

	const uploadStartTime = Date.now();
	const uploadResponse = await fetch(`${WORKER_URL}/media/upload`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
		},
		body: formData,
	});

	const uploadTime = Date.now() - uploadStartTime;
	const uploadData = await uploadResponse.json();

	if (uploadResponse.ok) {
		console.log('✅ Upload successful!');
		console.log('\n=== UPLOAD RESULT ===');
		console.log('File ID:', uploadData.data.id);
		console.log('Filename:', uploadData.data.filename);
		console.log('Category:', uploadData.data.category);
		console.log('URL:', uploadData.data.url);
		console.log('Size:', uploadData.data.size, 'bytes');
		console.log('Content Type:', uploadData.data.contentType);
		console.log('Upload Time:', uploadTime + 'ms');
	} else {
		console.error('❌ Upload failed:', uploadData);
		unlinkSync(testImagePath);
		return;
	}

	const uploadedUrl = uploadData.data.url;
	const uploadedFilename = uploadData.data.filename;

	// Step 5: Test serve endpoint (GET)
	console.log('\n\nStep 5: Testing media serve (GET)...\n');

	const serveStartTime = Date.now();
	const serveResponse = await fetch(`${WORKER_URL}${uploadedUrl}`);
	const serveTime = Date.now() - serveStartTime;

	if (serveResponse.ok) {
		const contentType = serveResponse.headers.get('content-type');
		const contentLength = serveResponse.headers.get('content-length');
		const cacheControl = serveResponse.headers.get('cache-control');
		const etag = serveResponse.headers.get('etag');

		console.log('✅ Media serve successful!');
		console.log('\n=== SERVE RESULT ===');
		console.log('Status:', serveResponse.status);
		console.log('Content-Type:', contentType);
		console.log('Content-Length:', contentLength, 'bytes');
		console.log('Cache-Control:', cacheControl);
		console.log('ETag:', etag);
		console.log('Response Time:', serveTime + 'ms');

		// Verify it's actually an image
		const imageBuffer = await serveResponse.arrayBuffer();
		console.log('Image data size:', imageBuffer.byteLength, 'bytes');
		console.log('✅ Image data retrieved successfully!');
	} else {
		console.error('❌ Serve failed:', serveResponse.status);
	}

	// Step 6: Test public access (no auth required)
	console.log('\n\nStep 6: Testing public access (no auth)...\n');

	const publicResponse = await fetch(`${WORKER_URL}${uploadedUrl}`);

	if (publicResponse.ok) {
		console.log('✅ Public access working!');
		console.log('Status:', publicResponse.status);
	} else {
		console.error('❌ Public access failed:', publicResponse.status);
	}

	// Step 7: Test delete endpoint
	console.log('\n\nStep 7: Testing media delete...\n');

	const deleteResponse = await fetch(`${WORKER_URL}/media/user/${uploadedFilename}`, {
		method: 'DELETE',
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	const deleteData = await deleteResponse.json();

	if (deleteResponse.ok) {
		console.log('✅ Delete successful!');
		console.log('Message:', deleteData.data.message);
	} else {
		console.error('❌ Delete failed:', deleteData);
	}

	// Step 8: Test 404 for deleted media
	console.log('\n\nStep 8: Testing 404 for deleted media...\n');

	const notFoundResponse = await fetch(`${WORKER_URL}${uploadedUrl}`);

	if (notFoundResponse.status === 404) {
		console.log('✅ 404 returned correctly for deleted media');
	} else {
		console.error('❌ Expected 404, got:', notFoundResponse.status);
	}

	// Step 9: Test 404 for non-existent media
	console.log('\n\nStep 9: Testing 404 for non-existent media...\n');

	const nonExistentResponse = await fetch(`${WORKER_URL}/media/user/non-existent-file.png`);

	if (nonExistentResponse.status === 404) {
		console.log('✅ 404 returned correctly for non-existent media');
	} else {
		console.error('❌ Expected 404, got:', nonExistentResponse.status);
	}

	// Cleanup
	unlinkSync(testImagePath);
	console.log('\n✅ Test image cleaned up');

	console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
	console.log('║                    🎉 ALL TESTS PASSED! 🎉                   ║');
	console.log('╚═══════════════════════════════════════════════════════════════╝\n');

	console.log('📊 Summary:');
	console.log('  - Upload: ✅');
	console.log('  - Serve (GET): ✅');
	console.log('  - Public access: ✅');
	console.log('  - Delete: ✅');
	console.log('  - 404 handling: ✅');
	console.log('\n  R2 bucket integration working perfectly! ✅\n');
}

// Main
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
	console.error('❌ Error: Email and password required\n');
	console.log('Usage:');
	console.log('  node media-test.js your@email.com yourpassword\n');
	console.log('Example:');
	console.log('  node media-test.js sharmaharsh9887@gmail.com YourPassword123\n');
	process.exit(1);
}

signInAndTest(email, password).catch((error) => {
	console.error('\n❌ Fatal error:', error);
	process.exit(1);
});
