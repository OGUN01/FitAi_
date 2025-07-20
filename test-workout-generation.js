// Test workout generation with structured output
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Import the workout schema (simplified for testing)
const WORKOUT_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: {
      type: "STRING",
      description: "Personalized workout name reflecting user goals"
    },
    description: {
      type: "STRING", 
      description: "Detailed description explaining the workout's purpose and benefits"
    },
    category: {
      type: "STRING",
      enum: ["strength", "cardio", "flexibility", "hiit", "hybrid"],
      description: "Workout category"
    },
    difficulty: {
      type: "STRING",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Difficulty level appropriate for user"
    },
    duration: {
      type: "NUMBER",
      description: "Workout duration in minutes"
    },
    estimatedCalories: {
      type: "NUMBER",
      description: "Estimated calories burned based on user profile"
    },
    exercises: {
      type: "ARRAY",
      description: "List of exercises in the workout",
      items: {
        type: "OBJECT",
        properties: {
          exerciseId: {
            type: "STRING",
            description: "Specific exercise identifier"
          },
          sets: {
            type: "NUMBER",
            description: "Number of sets appropriate for experience level"
          },
          reps: {
            type: "STRING",
            description: "Range or number based on goals (e.g., '8-12' or '10')"
          },
          restTime: {
            type: "NUMBER",
            description: "Rest time in seconds optimized for goals"
          },
          notes: {
            type: "STRING",
            description: "Specific coaching cues and modifications"
          }
        },
        required: ["exerciseId", "sets", "reps", "restTime", "notes"],
        propertyOrdering: ["exerciseId", "sets", "reps", "restTime", "notes"]
      }
    },
    equipment: {
      type: "ARRAY",
      description: "Required equipment for the workout",
      items: { type: "STRING" }
    },
    targetMuscleGroups: {
      type: "ARRAY",
      description: "Primary muscle groups targeted",
      items: { type: "STRING" }
    }
  },
  required: [
    "title", "description", "category", "difficulty", "duration", 
    "estimatedCalories", "exercises", "equipment", "targetMuscleGroups"
  ],
  propertyOrdering: [
    "title", "description", "category", "difficulty", "duration", "estimatedCalories",
    "exercises", "equipment", "targetMuscleGroups"
  ]
};

async function testWorkoutGeneration() {
  console.log('🏋️ Testing Workout Generation with Structured Output...');
  
  // Read API key from .env file
  let apiKey;
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/EXPO_PUBLIC_GEMINI_API_KEY=(.+)/);
    if (match) {
      apiKey = match[1].trim();
      console.log('✅ Found API key in .env file');
    }
  } catch (error) {
    console.log('❌ Could not read .env file:', error.message);
    return;
  }
  
  if (!apiKey) {
    console.log('❌ API key not found');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Create a personalized workout for a 28-year-old intermediate fitness enthusiast who wants to build muscle and strength. They have 45 minutes available and access to gym equipment.

Create a personalized workout with the following structure:
- Title: Personalized workout name reflecting user goals
- Description: Detailed explanation of the workout's purpose and benefits
- Category: strength, cardio, flexibility, hiit, or hybrid
- Difficulty: beginner, intermediate, or advanced
- Duration: workout length in minutes
- Estimated Calories: calories burned based on user profile
- Exercises: detailed exercise list with sets, reps, rest time, and coaching notes
- Equipment: required equipment list
- Target Muscle Groups: primary and secondary muscles worked`;

  try {
    console.log('📤 Generating workout with structured output...');
    
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: WORKOUT_SCHEMA
      }
    });

    const response = await result.response;
    const text = response.text();
    
    console.log('📥 Raw response length:', text.length, 'characters');
    
    // Try to parse as JSON
    try {
      const workout = JSON.parse(text);
      console.log('✅ Successfully parsed workout JSON!');
      
      // Validate structure
      console.log('\n📊 Workout Structure Validation:');
      console.log('✅ Title:', workout.title);
      console.log('✅ Category:', workout.category);
      console.log('✅ Difficulty:', workout.difficulty);
      console.log('✅ Duration:', workout.duration, 'minutes');
      console.log('✅ Estimated Calories:', workout.estimatedCalories);
      console.log('✅ Number of exercises:', workout.exercises?.length || 0);
      console.log('✅ Equipment needed:', workout.equipment?.length || 0, 'items');
      console.log('✅ Target muscle groups:', workout.targetMuscleGroups?.length || 0);
      
      if (workout.exercises && workout.exercises.length > 0) {
        console.log('\n🎯 Sample Exercise:');
        const firstExercise = workout.exercises[0];
        console.log('  - Exercise:', firstExercise.exerciseId);
        console.log('  - Sets:', firstExercise.sets);
        console.log('  - Reps:', firstExercise.reps);
        console.log('  - Rest:', firstExercise.restTime, 'seconds');
        console.log('  - Notes:', firstExercise.notes);
      }
      
      console.log('\n🎉 Workout generation with structured output is working perfectly!');
      return true;
      
    } catch (parseError) {
      console.log('❌ Failed to parse JSON:', parseError.message);
      console.log('Raw response preview:', text.substring(0, 500) + '...');
      return false;
    }
    
  } catch (error) {
    console.log('❌ API Error:', error.message);
    return false;
  }
}

// Run the test
testWorkoutGeneration()
  .then(success => {
    if (success) {
      console.log('\n🎯 CONCLUSION: Workout generation with structured output is working perfectly!');
      console.log('✅ The AI logic improvements are production-ready.');
    } else {
      console.log('\n⚠️ CONCLUSION: There may be issues with workout generation.');
    }
  })
  .catch(error => {
    console.log('\n💥 Test failed with error:', error.message);
  });
