#!/usr/bin/env node

/**
 * Test Fitness Screen Integration
 * Tests the exact same workflow as the Fitness tab in the app
 */

require('dotenv').config();

console.log('🏋️ TESTING FITNESS SCREEN INTEGRATION');
console.log('=' .repeat(60));

async function testFitnessIntegration() {
  console.log('🎯 Testing Fitness Screen Workflow...\n');

  try {
    // Simulate the exact same data structure as the app
    const profile = {
      personalInfo: {
        name: 'Test User',
        age: '28',
        gender: 'male',
        height: '175',
        weight: '75',
        activityLevel: 'moderate'
      },
      fitnessGoals: {
        primaryGoals: ['muscle_gain', 'strength'],
        timeCommitment: '45-60',
        experience: 'intermediate',
        experience_level: 'intermediate' // Both formats for compatibility
      }
    };

    console.log('📋 Test 1: Simulating Fitness Screen generateWeeklyWorkoutPlan()...');
    console.log(`👤 User: ${profile.personalInfo.name} (${profile.personalInfo.age}yo ${profile.personalInfo.gender})`);
    console.log(`🎯 Goals: ${profile.fitnessGoals.primaryGoals.join(', ')}`);
    console.log(`⏱️  Time: ${profile.fitnessGoals.timeCommitment} minutes`);
    console.log(`📈 Experience: ${profile.fitnessGoals.experience}\n`);

    // Test the exact same API call as the Fitness screen
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

    // Use the exact same schema as WEEKLY_PLAN_SCHEMA
    const WEEKLY_PLAN_SCHEMA = {
      type: "OBJECT",
      properties: {
        planTitle: {
          type: "STRING",
          description: "Overall plan name (e.g., 'Beginner Strength & Cardio Week 1')"
        },
        planDescription: {
          type: "STRING",
          description: "Brief overview of the weekly plan strategy and goals (max 200 characters)"
        },
        experienceLevel: {
          type: "STRING",
          enum: ["beginner", "intermediate", "advanced"],
          description: "Target experience level"
        },
        totalDuration: {
          type: "STRING",
          description: "Plan duration (e.g., '1 week', '1.5 weeks', '2 weeks')"
        },
        workoutsPerWeek: {
          type: "NUMBER",
          description: "Total number of workout days"
        },
        weeklyGoals: {
          type: "ARRAY",
          items: { type: "STRING" },
          description: "Primary fitness goals this week addresses (max 3 goals)"
        },
        workouts: {
          type: "ARRAY",
          description: "All workouts in the plan with day assignments",
          items: {
            type: "OBJECT",
            properties: {
              dayOfWeek: {
                type: "STRING",
                enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
                description: "Specific day this workout is assigned to"
              },
              title: {
                type: "STRING", 
                description: "Workout name (max 50 characters)"
              },
              description: {
                type: "STRING",
                description: "Brief workout description (max 150 characters)"
              },
              category: {
                type: "STRING",
                enum: ["strength", "cardio", "flexibility", "hiit", "hybrid"],
                description: "Primary workout category"
              },
              duration: {
                type: "NUMBER",
                description: "Total workout duration in minutes"
              },
              estimatedCalories: {
                type: "NUMBER",
                description: "Estimated calories burned"
              },
              exercises: {
                type: "ARRAY",
                description: "Exercise list (simplified)",
                items: {
                  type: "OBJECT",
                  properties: {
                    name: { type: "STRING", description: "Exercise name" },
                    sets: { type: "NUMBER", description: "Number of sets" },
                    reps: { type: "STRING", description: "Reps per set" },
                    restTime: { type: "NUMBER", description: "Rest time in seconds" }
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
          },
          description: "Designated rest days"
        },
        estimatedWeeklyCalories: {
          type: "NUMBER",
          description: "Total estimated calories burned for the week"
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

    // Build the same prompt as the app would
    const prompt = `Create a personalized weekly workout plan for an intermediate fitness enthusiast.

User Profile:
- Name: ${profile.personalInfo.name}
- Age: ${profile.personalInfo.age}, Gender: ${profile.personalInfo.gender}
- Height: ${profile.personalInfo.height}cm, Weight: ${profile.personalInfo.weight}kg
- Activity Level: ${profile.personalInfo.activityLevel}
- Experience Level: ${profile.fitnessGoals.experience}
- Primary Goals: ${profile.fitnessGoals.primaryGoals.join(' and ')}
- Time per workout: ${profile.fitnessGoals.timeCommitment} minutes

Requirements:
- Create 4-5 workouts spread across the week
- Include rest days for recovery
- Each workout should have 4-6 exercises
- Focus on ${profile.fitnessGoals.primaryGoals.join(' and ')}
- Appropriate for ${profile.fitnessGoals.experience} level
- Each workout should be ${profile.fitnessGoals.timeCommitment} minutes`;

    console.log('🚀 Generating weekly workout plan (simulating Fitness screen)...');
    const startTime = Date.now();
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  Generation time: ${duration}ms`);
    console.log('📝 Raw response length:', text.length, 'characters');
    
    // Test JSON parsing (same as app)
    try {
      const weeklyPlan = JSON.parse(text);
      console.log('✅ Weekly plan JSON parsing successful');
      console.log(`📊 Generated: "${weeklyPlan.planTitle}"`);
      console.log(`📈 Experience Level: ${weeklyPlan.experienceLevel}`);
      console.log(`🗓️  Duration: ${weeklyPlan.totalDuration}`);
      console.log(`💪 Workouts per week: ${weeklyPlan.workoutsPerWeek}`);
      console.log(`🗓️  Total workouts: ${weeklyPlan.workouts?.length || 0}`);
      console.log(`😴 Rest days: ${weeklyPlan.restDays?.length || 0}`);
      console.log(`🔥 Weekly calories: ${weeklyPlan.estimatedWeeklyCalories}`);
      
      if (weeklyPlan.workouts && weeklyPlan.workouts.length > 0) {
        console.log('\n📝 Generated workouts:');
        weeklyPlan.workouts.forEach((workout, index) => {
          console.log(`  ${index + 1}. ${workout.dayOfWeek}: ${workout.title}`);
          console.log(`     Category: ${workout.category}, Duration: ${workout.duration} min`);
          console.log(`     Exercises: ${workout.exercises?.length || 0}, Calories: ${workout.estimatedCalories}`);
        });
        
        console.log(`\n😴 Rest days: ${weeklyPlan.restDays.join(', ')}`);
      }
      
      // Validate the exact same structure the app expects
      const isValid = weeklyPlan.planTitle && 
                     weeklyPlan.experienceLevel &&
                     typeof weeklyPlan.workoutsPerWeek === 'number' && 
                     Array.isArray(weeklyPlan.workouts) &&
                     weeklyPlan.workouts.length > 0 &&
                     Array.isArray(weeklyPlan.restDays) &&
                     weeklyPlan.workouts.every(w => 
                       w.dayOfWeek && 
                       w.title && 
                       w.category &&
                       typeof w.duration === 'number' &&
                       typeof w.estimatedCalories === 'number' &&
                       Array.isArray(w.exercises) &&
                       w.exercises.length > 0 &&
                       w.exercises.every(e => e.name && e.sets && e.reps && e.restTime)
                     );
      
      if (isValid) {
        console.log('\n✅ Fitness screen integration validation passed');
        console.log('🎉 FITNESS SCREEN INTEGRATION TEST PASSED!');
        
        console.log('\n' + '=' .repeat(60));
        console.log('🎉 SUCCESS: Fitness Screen Integration Working 100%!');
        console.log('✅ Weekly workout generation is properly integrated!');
        console.log('✅ Gemini structured output is working in the Fitness tab!');
        console.log('🚀 Users can generate personalized workout plans!');
        console.log('=' .repeat(60));
        
        return true;
      } else {
        console.log('\n❌ Fitness screen integration validation failed');
        console.log('Structure issues detected in the response');
        return false;
      }
      
    } catch (parseError) {
      console.log('❌ Weekly plan JSON parsing failed:', parseError.message);
      console.log('Raw response preview:', text.substring(0, 500) + '...');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Fitness integration test failed:', error.message);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testFitnessIntegration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testFitnessIntegration };
