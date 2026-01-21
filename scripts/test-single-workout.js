#!/usr/bin/env node

const fetch = require("node-fetch");

// Load environment variables
const TEST_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;
const BACKEND_URL =
  process.env.WORKERS_URL ||
  "https://fitai-workers.sharmaharsh9887.workers.dev";
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!TEST_EMAIL) {
  throw new Error("TEST_USER_EMAIL environment variable is required");
}
if (!TEST_PASSWORD) {
  throw new Error("TEST_USER_PASSWORD environment variable is required");
}
if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required");
}

(async () => {
  // Authenticate
  const authResponse = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    },
  );

  const auth = await authResponse.json();
  console.log("✅ Authenticated");

  // Generate workout
  const workoutResponse = await fetch(`${BACKEND_URL}/workout/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.access_token}`,
    },
    body: JSON.stringify({
      userId: auth.user.id,
      profile: {
        age: 25,
        weight: 70,
        height: 175,
        gender: "male",
        fitnessGoal: "muscle_gain",
        experienceLevel: "beginner",
        availableEquipment: ["body weight", "dumbbell", "barbell"],
        workoutDuration: 60,
        workoutsPerWeek: 4,
      },
      weeklyPlan: {
        activityLevel: "sedentary",
        prefersVariety: true,
      },
    }),
  });

  const result = await workoutResponse.json();
  console.log("\n📦 Response:");
  console.log(JSON.stringify(result, null, 2));
})();
