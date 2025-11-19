/**
 * Diagnostic test for diet generation
 */

const API_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const TOKEN = process.argv[2];

if (!TOKEN) {
  console.error('Usage: node test-diet-diagnostic.js <auth-token>');
  process.exit(1);
}

async function testDietGeneration() {
  console.log('🔍 Testing Diet Generation Endpoint...\n');

  const minimalRequest = {
    calorieTarget: 2500,
    mealsPerDay: 4,
    macros: {
      protein: 30,
      carbs: 40,
      fats: 30,
    },
  };

  console.log('Request body:', JSON.stringify(minimalRequest, null, 2));
  console.log('\nSending request...\n');

  try {
    const response = await fetch(`${API_URL}/diet/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalRequest),
    });

    const status = response.status;
    const text = await response.text();

    console.log('Status:', status);

    if (status !== 200) {
      console.log('\n❌ Request failed');
      try {
        const error = JSON.parse(text);
        console.log('\nError details:');
        console.log('  Message:', error.error?.message);
        console.log('  Code:', error.error?.code);
        console.log('  Details:', JSON.stringify(error.error?.details, null, 2));
      } catch (e) {
        console.log('\nRaw error:', text);
      }
    } else {
      console.log('\n✅ Request succeeded!');
      const data = JSON.parse(text);
      console.log('\nDiet plan details:');
      console.log('  Title:', data.data?.title || 'N/A');
      console.log('  Meals:', data.data?.meals?.length || 0);
      console.log('  Total Calories:', data.data?.totalCalories || 0);
      console.log('  Cached:', data.metadata?.cached || false);
      console.log('  Model:', data.metadata?.model);
      console.log('  Generation time:', data.metadata?.generationTime + 'ms');
    }
  } catch (error) {
    console.error('\n❌ Exception:', error.message);
  }
}

testDietGeneration();
