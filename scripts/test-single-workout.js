#!/usr/bin/env node

const fetch = require('node-fetch');

const TEST_EMAIL = 'harshsharmacop@gmail.com';
const TEST_PASSWORD = 'Harsh@9887';
const BACKEND_URL = 'https://fitai-workers.sharmaharsh9887.workers.dev';
const SUPABASE_URL = 'https://mqfrwtmkokivoxgukgsz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTE4ODcsImV4cCI6MjA2ODQ4Nzg4N30.8As2juloSC89Pjql1_85757e8z4uGUqQHuzhVCY7M08';

(async () => {
  // Authenticate
  const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  const auth = await authResponse.json();
  console.log('✅ Authenticated');

  // Generate workout
  const workoutResponse = await fetch(`${BACKEND_URL}/workout/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.access_token}`,
    },
    body: JSON.stringify({
      userId: auth.user.id,
      profile: {
        age: 25,
        weight: 70,
        height: 175,
        gender: 'male',
        fitnessGoal: 'muscle_gain',
        experienceLevel: 'beginner',
        availableEquipment: ['body weight', 'dumbbell', 'barbell'],
        workoutDuration: 60,
        workoutsPerWeek: 4,
      },
      weeklyPlan: {
        activityLevel: 'sedentary',
        prefersVariety: true,
      },
    }),
  });

  const result = await workoutResponse.json();
  console.log('\n📦 Response:');
  console.log(JSON.stringify(result, null, 2));
})();
