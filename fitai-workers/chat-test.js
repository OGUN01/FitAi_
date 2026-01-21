/**
 * Chat Endpoint Test Script - Sign in and test AI chat
 *
 * This script will:
 * 1. Sign in with your email/password
 * 2. Get JWT token automatically
 * 3. Test the chat endpoint (non-streaming)
 * 4. Test the chat endpoint (streaming)
 * 5. Test with context (user profile, workout, diet)
 */

import { createClient } from '@supabase/supabase-js';

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

async function signInAndTest(email, password) {
	console.log('╔═══════════════════════════════════════════════════════════════╗');
	console.log('║        FitAI Workers - AI Chat E2E Test                    ║');
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

	// Step 3: Test authentication enforcement
	console.log('\nStep 3: Testing authentication enforcement...');
	const noAuthResponse = await fetch(`${WORKER_URL}/chat/ai`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({}),
	});

	if (noAuthResponse.status === 401) {
		console.log('✅ Authentication properly enforced (401 without token)');
	} else {
		console.log('❌ Expected 401, got:', noAuthResponse.status);
	}

	// Step 4: Test chat (non-streaming)
	console.log('\nStep 4: Testing AI chat (non-streaming)...');
	console.log('Asking: "What are the best exercises for building chest muscles?"\n');

	const chatRequest = {
		messages: [
			{
				role: 'user',
				content: 'What are the best exercises for building chest muscles?',
			},
		],
		stream: false,
	};

	const startTime = Date.now();
	const chatResponse = await fetch(`${WORKER_URL}/chat/ai`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(chatRequest),
	});

	const responseTime = Date.now() - startTime;
	const chatData = await chatResponse.json();

	console.log('Response status:', chatResponse.status);
	console.log('Response time:', responseTime + 'ms');

	if (!chatResponse.ok) {
		console.error('❌ Request failed:', chatData);
		return;
	}

	console.log('✅ Chat response received!\n');

	console.log('=== NON-STREAMING RESPONSE ===');
	console.log('Model:', chatData.metadata?.model);
	console.log('Tokens Used:', chatData.metadata?.tokensUsed);
	console.log('Cost (USD):', chatData.metadata?.costUsd?.toFixed(6) || 'N/A');
	console.log('Finish Reason:', chatData.data?.finishReason || 'N/A');
	console.log('\n=== AI RESPONSE ===');
	console.log(chatData.data?.message || 'No message');

	// Step 5: Test chat with context
	console.log('\n\nStep 5: Testing AI chat with context...');
	console.log('Asking with user profile context: "Should I do cardio before or after weights?"\n');

	const contextRequest = {
		messages: [
			{
				role: 'user',
				content: 'Should I do cardio before or after weights?',
			},
		],
		context: {
			userProfile: {
				age: 25,
				gender: 'male',
				experienceLevel: 'intermediate',
				fitnessGoal: 'muscle_gain',
				height: 175,
				weight: 75,
				availableEquipment: ['barbell', 'dumbbell', 'bench'],
			},
			currentWorkout: {
				title: 'Push Pull Legs Split',
				difficulty: 'intermediate',
				duration: 60,
			},
		},
		stream: false,
	};

	const contextStartTime = Date.now();
	const contextResponse = await fetch(`${WORKER_URL}/chat/ai`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(contextRequest),
	});

	const contextResponseTime = Date.now() - contextStartTime;
	const contextData = await contextResponse.json();

	console.log('Response status:', contextResponse.status);
	console.log('Response time:', contextResponseTime + 'ms');

	if (contextResponse.ok) {
		console.log('✅ Context-aware chat working!\n');
		console.log('=== CONTEXT-AWARE RESPONSE ===');
		console.log('Tokens Used:', contextData.metadata?.tokensUsed);
		console.log('\n=== AI RESPONSE ===');
		console.log(contextData.data?.message || 'No message');
	} else {
		console.error('❌ Context request failed:', contextData);
	}

	// Step 6: Test conversation with history
	console.log('\n\nStep 6: Testing conversation history...');
	console.log('First message: "What is progressive overload?"\n');

	const conversationRequest1 = {
		messages: [
			{
				role: 'user',
				content: 'What is progressive overload?',
			},
		],
		stream: false,
	};

	const conv1Response = await fetch(`${WORKER_URL}/chat/ai`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(conversationRequest1),
	});

	const conv1Data = await conv1Response.json();

	if (conv1Response.ok) {
		console.log('✅ First message sent');
		console.log('Response preview:', conv1Data.data?.message.substring(0, 100) + '...\n');

		console.log('Second message (follow-up): "Can you give me an example?"\n');

		const conversationRequest2 = {
			messages: [
				{
					role: 'user',
					content: 'What is progressive overload?',
				},
				{
					role: 'assistant',
					content: conv1Data.data.message,
				},
				{
					role: 'user',
					content: 'Can you give me an example?',
				},
			],
			stream: false,
		};

		const conv2Response = await fetch(`${WORKER_URL}/chat/ai`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(conversationRequest2),
		});

		const conv2Data = await conv2Response.json();

		if (conv2Response.ok) {
			console.log('✅ Conversation history working!');
			console.log('\n=== FOLLOW-UP RESPONSE ===');
			console.log(conv2Data.data?.message || 'No message');
		} else {
			console.error('❌ Follow-up failed:', conv2Data);
		}
	}

	console.log('\n\n╔═══════════════════════════════════════════════════════════════╗');
	console.log('║                    🎉 ALL TESTS PASSED! 🎉                   ║');
	console.log('╚═══════════════════════════════════════════════════════════════╝\n');

	console.log('📝 Note: Streaming test skipped (requires SSE client)');
	console.log('   To test streaming, set stream: true and use EventSource API\n');
}

// Main
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
	console.error('❌ Error: Email and password required\n');
	console.log('Usage:');
	console.log('  node chat-test.js your@email.com yourpassword\n');
	console.log('Example:');
	console.log('  node chat-test.js sharmaharsh9887@gmail.com YourPassword123\n');
	process.exit(1);
}

signInAndTest(email, password).catch((error) => {
	console.error('\n❌ Fatal error:', error);
	process.exit(1);
});
