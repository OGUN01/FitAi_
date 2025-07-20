// Quick test script to verify real AI integration
// Run with: node testRealAI.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = 'AIzaSyB8R9mFwn3Yguo8NUc4g-e_HnOS5EnqMQg';

async function testGeminiAPI() {
  console.log('🔗 Testing Gemini 2.5 Flash API Connection...\n');

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
        responseMimeType: "text/plain",
      }
    });

    const prompt = `You are a professional fitness trainer. Generate a personalized workout for:
    - User: 28-year-old male, 175cm, 70kg, moderate activity level
    - Goals: muscle gain, strength
    - Experience: intermediate
    - Time: 45 minutes
    - Equipment: dumbbells, bodyweight

    Return ONLY a valid JSON object with this structure:
    {
      "title": "Workout Name",
      "description": "Brief description",
      "category": "strength",
      "difficulty": "intermediate",
      "duration": 45,
      "estimatedCalories": 350,
      "exercises": [
        {
          "exerciseId": "push_up",
          "sets": 3,
          "reps": "10-12",
          "restTime": 60,
          "notes": "Focus on form"
        }
      ],
      "equipment": ["dumbbells", "bodyweight"],
      "targetMuscleGroups": ["chest", "arms", "core"],
      "tags": ["strength", "muscle-building"]
    }`;

    console.log('📤 Sending request to Gemini 2.5 Flash...');
    const startTime = Date.now();

    const result = await model.generateContent(prompt);
    const response = await result.response;

    // Check for safety blocks
    if (response.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
    }

    const text = response.text();
    const endTime = Date.now();
    const duration = endTime - startTime;
    const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

    console.log('✅ Gemini 2.5 Flash response received!');
    console.log(`⏱️ Generation time: ${duration}ms`);
    console.log(`🔢 Tokens used: ${tokensUsed}`);
    console.log(`🧠 Model: gemini-2.5-flash`);
    console.log('\n📋 Raw Response Preview:');
    console.log(text.substring(0, 300) + (text.length > 300 ? '...' : ''));

    // Try to parse JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const workout = JSON.parse(jsonMatch[0]);
        console.log('\n✅ JSON Parsing Successful!');
        console.log('🏋️ Generated Workout:');
        console.log(`Title: ${workout.title}`);
        console.log(`Description: ${workout.description}`);
        console.log(`Duration: ${workout.duration} minutes`);
        console.log(`Calories: ${workout.estimatedCalories}`);
        console.log(`Exercises: ${workout.exercises?.length || 0}`);
        console.log(`Equipment: ${workout.equipment?.join(', ') || 'N/A'}`);
        
        if (workout.exercises && workout.exercises.length > 0) {
          console.log('\n📝 First Exercise:');
          const ex = workout.exercises[0];
          console.log(`- ID: ${ex.exerciseId}`);
          console.log(`- Sets: ${ex.sets}`);
          console.log(`- Reps: ${ex.reps}`);
          console.log(`- Rest: ${ex.restTime}s`);
        }
        
        console.log('\n🎉 GEMINI 2.5 FLASH INTEGRATION WORKING PERFECTLY! 🤖✨');
        console.log('🚀 Latest AI model successfully generating personalized content!');
        return true;
      } else {
        console.log('❌ No JSON found in response');
        return false;
      }
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      return false;
    }

  } catch (error) {
    console.log('❌ API Test Failed:', error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('🔑 The API key appears to be invalid. Please check it.');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('🚫 Permission denied. The API key might not have the right permissions.');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.log('📊 API quota exceeded. You might need to check your usage limits.');
    }
    
    return false;
  }
}

async function testNutritionGeneration() {
  console.log('\n🍽️ Testing Gemini 2.5 Flash Nutrition Generation...\n');

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const prompt = `You are a certified nutritionist. Create a healthy breakfast for:
    - User: 28-year-old male, 175cm, 70kg, moderate activity
    - Goals: muscle gain
    - Calorie target: 500 calories

    Return ONLY a valid JSON object:
    {
      "name": "Meal Name",
      "items": [
        {
          "name": "Food Item",
          "quantity": 100,
          "unit": "g",
          "calories": 200,
          "protein": 20,
          "carbs": 30,
          "fat": 5
        }
      ],
      "totalCalories": 500,
      "prepTime": 10,
      "difficulty": "easy"
    }`;

    console.log('📤 Generating meal plan...');
    const startTime = Date.now();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const duration = Date.now() - startTime;

    console.log('✅ Meal generated!');
    console.log(`⏱️ Generation time: ${duration}ms`);

    // Parse JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const meal = JSON.parse(jsonMatch[0]);
      console.log('\n🍳 Generated Meal:');
      console.log(`Name: ${meal.name}`);
      console.log(`Calories: ${meal.totalCalories}`);
      console.log(`Prep Time: ${meal.prepTime} minutes`);
      console.log(`Items: ${meal.items?.length || 0}`);
      
      if (meal.items && meal.items.length > 0) {
        console.log('\n📋 Ingredients:');
        meal.items.forEach((item, index) => {
          console.log(`${index + 1}. ${item.name} - ${item.quantity}${item.unit} (${item.calories} cal)`);
        });
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('❌ Nutrition generation failed:', error.message);
    return false;
  }
}

async function runFullTest() {
  console.log('🚀 FITAI GEMINI 2.5 FLASH INTEGRATION TEST\n');
  console.log('API Key:', API_KEY.substring(0, 20) + '...');
  console.log('Model: gemini-2.5-flash (LATEST)');
  console.log('Features: Enhanced reasoning, better JSON parsing, improved safety\n');
  
  let successCount = 0;
  
  // Test 1: Workout Generation
  if (await testGeminiAPI()) {
    successCount++;
  }
  
  // Test 2: Nutrition Generation
  if (await testNutritionGeneration()) {
    successCount++;
  }
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`✅ Successful: ${successCount}/2`);
  console.log(`❌ Failed: ${2 - successCount}/2`);
  
  if (successCount === 2) {
    console.log('\n🎉 ALL TESTS PASSED! FITAI IS NOW POWERED BY GEMINI 2.5 FLASH! 🤖✨');
    console.log('🚀 Your app now uses the LATEST AI model for superior personalization!');
    console.log('💡 Enhanced features: Better reasoning, improved safety, faster responses');
    console.log('🎯 Users will get the most advanced AI-powered fitness experience available!');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the error messages above.');
  }
}

// Run the test
runFullTest().catch(console.error);
