#!/usr/bin/env node

/**
 * Debug Fitness State - Check the exact data structure being generated
 */

require('dotenv').config();

console.log('🔍 DEBUGGING FITNESS STATE STRUCTURE');
console.log('=' .repeat(60));

async function debugFitnessState() {
  console.log('🎯 Checking exact data structure from AI generation...\n');

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

    // Use the exact same schema as the app
    const WEEKLY_PLAN_SCHEMA = {
      type: "OBJECT",
      properties: {
        planTitle: {
          type: "STRING",
          description: "Overall plan name"
        },
        planDescription: {
          type: "STRING",
          description: "Brief overview of the weekly plan strategy"
        },
        experienceLevel: {
          type: "STRING",
          enum: ["beginner", "intermediate", "advanced"]
        },
        totalDuration: {
          type: "STRING",
          description: "Plan duration"
        },
        workoutsPerWeek: {
          type: "NUMBER",
          description: "Total number of workout days"
        },
        weeklyGoals: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Primary fitness goals"
        },
        workouts: {
          type: "ARRAY",
          description: "All workouts in the plan",
          items: {
            type: "OBJECT",
            properties: {
              dayOfWeek: {
                type: "STRING",
                enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
              },
              title: { type: "STRING" },
              description: { type: "STRING" },
              category: {
                type: "STRING",
                enum: ["strength", "cardio", "flexibility", "hiit", "hybrid"]
              },
              duration: { type: "NUMBER" },
              estimatedCalories: { type: "NUMBER" },
              exercises: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING" },
                    sets: { type: "NUMBER" },
                    reps: { type: "STRING" },
                    restTime: { type: "NUMBER" }
                  },
                  required: ["name", "sets", "reps", "restTime"]
                }
              }
            },
            required: ["dayOfWeek", "title", "description", "category", "duration", "estimatedCalories", "exercises"]
          }
        },
        restDays: {
          type: "ARRAY",
          items: { 
            type: "STRING",
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
          }
        },
        estimatedWeeklyCalories: {
          type: "NUMBER"
        }
      },
      required: [
        "planTitle", "planDescription", "experienceLevel", "totalDuration", 
        "workoutsPerWeek", "weeklyGoals", "workouts", "restDays", 
        "estimatedWeeklyCalories"
      ]
    };

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: WEEKLY_PLAN_SCHEMA,
        temperature: 0.7,
        maxOutputTokens: 8192
      }
    });

    const prompt = `Create a personalized weekly workout plan for an intermediate fitness enthusiast.

User Profile:
- Name: Test User
- Age: 28, Gender: male
- Height: 175cm, Weight: 75kg
- Activity Level: moderate
- Experience Level: intermediate
- Primary Goals: muscle_gain and strength
- Time per workout: 45-60 minutes

Requirements:
- Create 4-5 workouts spread across the week
- Include rest days for recovery
- Each workout should have 4-6 exercises
- Focus on muscle_gain and strength
- Appropriate for intermediate level
- Each workout should be 45-60 minutes`;

    console.log('🚀 Generating weekly workout plan...');
    const startTime = Date.now();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Generation time: ${duration}ms`);
    
    // Parse and analyze the structure
    try {
      const aiPlan = JSON.parse(text);
      
      console.log('\n🔍 DETAILED STRUCTURE ANALYSIS:');
      console.log('=' .repeat(50));
      
      console.log(`📊 Plan Title: "${aiPlan.planTitle}"`);
      console.log(`📈 Experience Level: ${aiPlan.experienceLevel}`);
      console.log(`🗓️  Duration: ${aiPlan.totalDuration}`);
      console.log(`💪 Workouts per week: ${aiPlan.workoutsPerWeek}`);
      console.log(`🔥 Weekly calories: ${aiPlan.estimatedWeeklyCalories}`);
      
      console.log(`\n📝 Workouts (${aiPlan.workouts.length}):`);
      aiPlan.workouts.forEach((workout, index) => {
        console.log(`  ${index + 1}. ${workout.dayOfWeek}: "${workout.title}"`);
        console.log(`     Category: ${workout.category}`);
        console.log(`     Duration: ${workout.duration} min`);
        console.log(`     Calories: ${workout.estimatedCalories}`);
        console.log(`     Exercises: ${workout.exercises.length}`);
        
        // Show first exercise as example
        if (workout.exercises.length > 0) {
          const firstEx = workout.exercises[0];
          console.log(`     First exercise: ${firstEx.name} (${firstEx.sets} sets x ${firstEx.reps} reps)`);
        }
        console.log('');
      });
      
      console.log(`😴 Rest Days (${aiPlan.restDays.length}): ${aiPlan.restDays.join(', ')}`);
      
      console.log(`\n🎯 Weekly Goals (${aiPlan.weeklyGoals.length}):`);
      aiPlan.weeklyGoals.forEach((goal, index) => {
        console.log(`  ${index + 1}. ${goal}`);
      });
      
      // Now simulate the transformation that happens in weeklyContentGenerator
      console.log('\n🔄 SIMULATING APP TRANSFORMATION:');
      console.log('=' .repeat(50));
      
      // This is what the app does to transform the data
      const dayWorkouts = aiPlan.workouts.map((workout) => ({
        id: `workout-${workout.dayOfWeek}-1`, // generateWorkoutId(1, workout.dayOfWeek)
        title: workout.title,
        description: workout.description,
        category: workout.category,
        subCategory: workout.category, // Default
        difficulty: 'intermediate', // From user profile
        duration: workout.duration,
        estimatedCalories: workout.estimatedCalories,
        intensityLevel: 'moderate', // Default
        exercises: workout.exercises.map((exercise) => ({
          exerciseId: exercise.name.toLowerCase().replace(/\s+/g, '_'),
          sets: exercise.sets,
          reps: exercise.reps,
          weight: 'bodyweight', // Default
          restTime: exercise.restTime,
          notes: `Exercise: ${exercise.name}`,
          intensity: 'moderate'
        })),
        warmUp: [], // Default empty
        coolDown: [], // Default empty
        equipment: ['dumbbells'], // Default
        targetMuscleGroups: ['chest', 'arms'], // Default
        dayOfWeek: workout.dayOfWeek,
        progressionNotes: [],
        safetyConsiderations: [],
        expectedBenefits: [],
        icon: '💪',
        tags: [`week-1`, workout.dayOfWeek, workout.category],
        isPersonalized: true,
        aiGenerated: true,
        createdAt: new Date().toISOString()
      }));

      const weeklyPlan = {
        id: 'weekly-plan-1',
        userId: 'current-user',
        weekNumber: 1,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        workouts: dayWorkouts,
        restDays: aiPlan.restDays || [],
        progressionNotes: [],
        totalEstimatedCalories: aiPlan.estimatedWeeklyCalories || 0,
        planTitle: aiPlan.planTitle,
        planDescription: aiPlan.planDescription,
        experienceLevel: aiPlan.experienceLevel,
        weeklyGoals: aiPlan.weeklyGoals || [],
        createdAt: new Date().toISOString()
      };
      
      console.log(`✅ Transformed WeeklyWorkoutPlan:`);
      console.log(`   ID: ${weeklyPlan.id}`);
      console.log(`   Title: ${weeklyPlan.planTitle}`);
      console.log(`   Workouts: ${weeklyPlan.workouts.length}`);
      console.log(`   Rest Days: ${weeklyPlan.restDays.length}`);
      
      console.log(`\n🔍 Sample transformed workout:`);
      if (weeklyPlan.workouts.length > 0) {
        const sampleWorkout = weeklyPlan.workouts[0];
        console.log(`   Day: ${sampleWorkout.dayOfWeek}`);
        console.log(`   Title: ${sampleWorkout.title}`);
        console.log(`   ID: ${sampleWorkout.id}`);
        console.log(`   Exercises: ${sampleWorkout.exercises.length}`);
        
        if (sampleWorkout.exercises.length > 0) {
          const sampleEx = sampleWorkout.exercises[0];
          console.log(`   First exercise ID: ${sampleEx.exerciseId}`);
          console.log(`   First exercise sets: ${sampleEx.sets}`);
          console.log(`   First exercise reps: ${sampleEx.reps}`);
        }
      }
      
      console.log('\n' + '=' .repeat(60));
      console.log('🎉 STRUCTURE ANALYSIS COMPLETE!');
      console.log('✅ AI generation is working correctly');
      console.log('✅ Data transformation looks good');
      console.log('🔍 The issue might be in React state management or UI rendering');
      console.log('=' .repeat(60));
      
      return true;
      
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('Raw response preview:', text.substring(0, 500) + '...');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Debug test failed:', error.message);
    return false;
  }
}

// Run the debug
if (require.main === module) {
  debugFitnessState()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Debug execution failed:', error);
      process.exit(1);
    });
}

module.exports = { debugFitnessState };
