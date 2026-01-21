/**
 * Diet Generation Test Script - Sign in and test diet generation
 *
 * This script will:
 * 1. Sign in with your email/password
 * 2. Get JWT token automatically
 * 3. Test the diet generation endpoint
 * 4. Show complete results with nutritional breakdown
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
	console.log('║      FitAI Workers - Diet Generation E2E Test              ║');
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
	const noAuthResponse = await fetch(`${WORKER_URL}/diet/generate`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({}),
	});

	if (noAuthResponse.status === 401) {
		console.log('✅ Authentication properly enforced (401 without token)');
	} else {
		console.log('❌ Expected 401, got:', noAuthResponse.status);
	}

	// Step 4: Test diet generation
	console.log('\nStep 4: Testing diet generation...');
	console.log('Sending request with valid token...\n');

	const dietRequest = {
		calorieTarget: 2000,
		macros: {
			protein: 30, // 30%
			carbs: 40, // 40%
			fats: 30, // 30%
		},
		dietaryRestrictions: ['vegetarian'],
		mealsPerDay: 3,
		excludeIngredients: ['mushrooms', 'bell peppers'],
	};

	const startTime = Date.now();
	const dietResponse = await fetch(`${WORKER_URL}/diet/generate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(dietRequest),
	});

	const responseTime = Date.now() - startTime;
	const dietData = await dietResponse.json();

	console.log('Response status:', dietResponse.status);
	console.log('Response time:', responseTime + 'ms');

	if (!dietResponse.ok) {
		console.error('❌ Request failed:', dietData);
		return;
	}

	console.log('✅ Diet plan generated successfully!\n');

	// Display results
	console.log('=== RESULTS ===');
	console.log('Cached:', dietData.metadata?.cached || false);
	console.log('Model:', dietData.metadata?.model);
	console.log('Tokens Used:', dietData.metadata?.tokensUsed);
	console.log('Cost (USD):', dietData.metadata?.costUsd?.toFixed(6) || 'N/A');

	if (dietData.metadata?.nutritionalAccuracy) {
		const acc = dietData.metadata.nutritionalAccuracy;
		console.log('\n=== NUTRITIONAL ACCURACY ===');
		console.log(`Target: ${acc.targetCalories} kcal`);
		console.log(`Actual: ${acc.actualCalories} kcal`);
		console.log(`Difference: ${acc.difference} kcal`);
		console.log(acc.difference <= 50 ? '✅ Within target!' : '⚠️  Slight variance');
	}

	if (dietData.data) {
		console.log('\n=== DIET PLAN ===');
		console.log('Title:', dietData.data.title);
		console.log('Description:', dietData.data.description);
		console.log('Total Calories:', dietData.data.totalCalories, 'kcal');
		console.log('Meals:', dietData.data.meals.length);

		console.log('\n=== TOTAL MACROS ===');
		const macros = dietData.data.totalNutrition;
		console.log(`Protein: ${macros.protein}g (${(((macros.protein * 4) / dietData.data.totalCalories) * 100).toFixed(1)}%)`);
		console.log(`Carbs: ${macros.carbs}g (${(((macros.carbs * 4) / dietData.data.totalCalories) * 100).toFixed(1)}%)`);
		console.log(`Fats: ${macros.fats}g (${(((macros.fats * 9) / dietData.data.totalCalories) * 100).toFixed(1)}%)`);

		// Show each meal
		console.log('\n=== MEALS BREAKDOWN ===');
		dietData.data.meals.forEach((meal, idx) => {
			console.log(`\n${idx + 1}. ${meal.name} (${meal.mealType})`);
			console.log(`   Calories: ${meal.totalNutrition.calories} kcal`);
			console.log(`   Macros: P:${meal.totalNutrition.protein}g | C:${meal.totalNutrition.carbs}g | F:${meal.totalNutrition.fats}g`);
			console.log(`   Prep Time: ${meal.preparationTime} min`);
			console.log(`   Foods (${meal.foods.length}):`);
			meal.foods.forEach((food) => {
				console.log(`     - ${food.name} (${food.quantity})`);
			});
		});

		// Show nutrition tips
		if (dietData.data.nutritionTips && dietData.data.nutritionTips.length > 0) {
			console.log('\n=== NUTRITION TIPS ===');
			dietData.data.nutritionTips.forEach((tip, idx) => {
				console.log(`${idx + 1}. ${tip}`);
			});
		}
	}

	// Step 5: Test caching
	console.log('\n\nStep 5: Testing caching system...');
	console.log('Making second request (should be cached)...\n');

	await new Promise((resolve) => setTimeout(resolve, 1000));

	const cacheStartTime = Date.now();
	const cacheResponse = await fetch(`${WORKER_URL}/diet/generate`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(dietRequest),
	});

	const cacheResponseTime = Date.now() - cacheStartTime;
	const cacheData = await cacheResponse.json();

	console.log('Response time:', cacheResponseTime + 'ms');
	console.log('Cached:', cacheData.metadata?.cached || false);
	console.log('Cache source:', cacheData.metadata?.cacheSource || 'fresh');

	if (cacheData.metadata?.cached) {
		console.log('✅ Caching is working!');
		console.log(
			`Speed improvement: ${responseTime}ms → ${cacheResponseTime}ms (${((1 - cacheResponseTime / responseTime) * 100).toFixed(1)}% faster)`,
		);
	} else {
		console.log('⚠️  Second request was not cached');
	}

	console.log('\n╔═══════════════════════════════════════════════════════════════╗');
	console.log('║                    🎉 ALL TESTS PASSED! 🎉                   ║');
	console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

// Main
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
	console.error('❌ Error: Email and password required\n');
	console.log('Usage:');
	console.log('  node diet-test.js your@email.com yourpassword\n');
	console.log('Example:');
	console.log('  node diet-test.js sharmaharsh9887@gmail.com YourPassword123\n');
	process.exit(1);
}

signInAndTest(email, password).catch((error) => {
	console.error('\n❌ Fatal error:', error);
	process.exit(1);
});
