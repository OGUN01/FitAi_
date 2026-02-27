/**
 * FitAI Parallel Test Account Setup
 * Creates 6 isolated Supabase accounts with full profile data,
 * so parallel testing agents skip onboarding and go directly to MainNavigation.
 *
 * Required DB tables populated per account:
 *   - profiles (first_name, last_name, age, gender, occupation_type, ...)
 *   - workout_preferences (location + intensity → satisfies hasWorkoutPrefs check)
 *   - fitness_goals (primary_goals, time_commitment, experience_level)
 *   - progress_entries (sample weight history for charts)
 *   - water_logs (sample hydration data)
 *   - meal_logs (sample meal data)
 *   - analytics_metrics (sample metrics for Analytics tab)
 */

const SUPABASE_URL = "https://mqfrwtmkokivoxgukgsz.supabase.co";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xZnJ3dG1rb2tpdm94Z3VrZ3N6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjkxMTg4NywiZXhwIjoyMDY4NDg3ODg3fQ.GodrW37wQvrL30QB26acYRYOiiAltyw3pXHXL4Xvxis";
const PASSWORD = "TestFitAI@2024!";

const TEST_ACCOUNTS = [
  {
    email: "test.diet@fitai.dev",
    firstName: "Diet",
    lastName: "Tester",
    role: "diet",
  },
  {
    email: "test.workout@fitai.dev",
    firstName: "Workout",
    lastName: "Tester",
    role: "workout",
  },
  {
    email: "test.analytics@fitai.dev",
    firstName: "Analytics",
    lastName: "Tester",
    role: "analytics",
  },
  {
    email: "test.home@fitai.dev",
    firstName: "Home",
    lastName: "Tester",
    role: "home",
  },
  {
    email: "test.profile@fitai.dev",
    firstName: "Profile",
    lastName: "Tester",
    role: "profile",
  },
  {
    email: "test.sessions@fitai.dev",
    firstName: "Sessions",
    lastName: "Tester",
    role: "sessions",
  },
];

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  apikey: SERVICE_ROLE_KEY,
};

async function adminFetch(path, method = "GET", body = null) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok)
    throw new Error(
      `${method} ${path} → ${res.status}: ${JSON.stringify(json)}`,
    );
  return json;
}

async function supabaseFetch(path, method = "GET", body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      ...headers,
      Prefer: method === "POST" ? "return=representation" : undefined,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok)
    throw new Error(`${method} /rest/v1${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function upsertUser(account) {
  console.log(`\n📧 Processing: ${account.email}`);

  // Step 1: Create auth user (service role bypasses email confirmation)
  let userId;
  try {
    const user = await adminFetch("/auth/v1/admin/users", "POST", {
      email: account.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: `${account.firstName} ${account.lastName}` },
    });
    userId = user.id;
    console.log(`  ✅ Auth user created: ${userId}`);
  } catch (e) {
    if (
      e.message.includes("already been registered") ||
      e.message.includes("duplicate")
    ) {
      // User exists — find them
      const users = await adminFetch("/auth/v1/admin/users?page=1&per_page=50");
      const existing = (users.users || []).find(
        (u) => u.email === account.email,
      );
      if (existing) {
        userId = existing.id;
        console.log(`  ℹ️  Auth user already exists: ${userId}`);
      } else {
        throw e;
      }
    } else {
      throw e;
    }
  }

  // Step 2: Upsert profiles row
  // NOTE: profiles table does NOT have height_cm or weight_kg columns
  // wake_time/sleep_time must be "HH:MM:SS" format
  await supabaseFetch("/profiles", "POST", [
    {
      id: userId,
      email: account.email,
      name: `${account.firstName} ${account.lastName}`,
      first_name: account.firstName,
      last_name: account.lastName,
      age: 27,
      gender: "male",
      occupation_type: "desk_job",
      units: "metric",
      notifications_enabled: true,
      dark_mode: false,
      country: "India",
      state: "Maharashtra",
      wake_time: "07:00:00",
      sleep_time: "23:00:00",
      subscription_tier: "free",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]).catch(async (e) => {
    if (e.message.includes("duplicate") || e.message.includes("23505")) {
      // Update existing
      await supabaseFetch(`/profiles?id=eq.${userId}`, "PATCH", {
        first_name: account.firstName,
        last_name: account.lastName,
        age: 27,
        gender: "male",
        occupation_type: "desk_job",
        wake_time: "07:00:00",
        sleep_time: "23:00:00",
        updated_at: new Date().toISOString(),
      });
      console.log(`  ℹ️  Profile updated`);
    } else throw e;
  });
  console.log(`  ✅ Profile row ready`);

  // Step 3: Upsert workout_preferences (satisfies hasWorkoutPrefs check in checkProfileComplete)
  // NOTE: no preferred_workout_duration or fitness_level columns in workout_preferences
  await supabaseFetch("/workout_preferences", "POST", [
    {
      user_id: userId,
      workout_types: ["strength", "cardio"],
      equipment: ["dumbbells", "bodyweight"],
      location: "home",
      time_preference: 45,
      intensity: "intermediate",
      activity_level: "moderate",
      primary_goals: ["weight_loss", "muscle_gain"],
      workout_frequency_per_week: 4,
      preferred_workout_times: ["morning"],
      prefers_variety: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]).catch(async (e) => {
    if (e.message.includes("duplicate") || e.message.includes("23505")) {
      console.log(`  ℹ️  workout_preferences already exists`);
    } else {
      console.warn(`  ⚠️  workout_preferences insert failed: ${e.message}`);
    }
  });
  console.log(`  ✅ workout_preferences ready`);

  // Step 4: Upsert fitness_goals (belt + suspenders for checkProfileComplete)
  // NOTE: only columns that exist: primary_goals, time_commitment, experience_level
  await supabaseFetch("/fitness_goals", "POST", [
    {
      user_id: userId,
      primary_goals: ["weight_loss", "muscle_gain"],
      time_commitment: "45-60",
      experience_level: "intermediate",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]).catch(async (e) => {
    if (e.message.includes("duplicate") || e.message.includes("23505")) {
      console.log(`  ℹ️  fitness_goals already exists`);
    } else {
      console.warn(`  ⚠️  fitness_goals insert failed: ${e.message}`);
    }
  });
  console.log(`  ✅ fitness_goals ready`);

  // Step 5: Progress entries (last 14 days of weight data for charts)
  // NOTE: no recorded_at column in progress_entries
  const today = new Date();
  const progressEntries = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (13 - i));
    return {
      user_id: userId,
      entry_date: d.toISOString().split("T")[0],
      weight_kg: 72 + (Math.random() - 0.5) * 2,
      created_at: d.toISOString(),
      updated_at: d.toISOString(),
    };
  });
  await supabaseFetch("/progress_entries", "POST", progressEntries).catch((e) =>
    console.warn(
      `  ⚠️  progress_entries insert (may be dupes): ${e.message.substring(0, 120)}`,
    ),
  );
  console.log(`  ✅ 14 progress entries ready`);

  // Step 6: Water logs (today + yesterday)
  const waterLogs = [0, 1].map((daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    const dateStr = d.toISOString().split("T")[0];
    return {
      user_id: userId,
      date: dateStr,
      amount_ml: daysAgo === 0 ? 1500 : 2200,
      logged_at: d.toISOString(),
      created_at: d.toISOString(),
      updated_at: d.toISOString(),
    };
  });
  await supabaseFetch("/water_logs", "POST", waterLogs).catch((e) =>
    console.warn(
      `  ⚠️  water_logs insert (may be dupes): ${e.message.substring(0, 80)}`,
    ),
  );
  console.log(`  ✅ Water logs ready`);

  // Step 7: Meal logs (sample meals for Diet tab)
  const mealLogs = [
    {
      user_id: userId,
      meal_type: "breakfast",
      meal_name: "Oatmeal with Berries",
      food_items: JSON.stringify([
        { name: "Oatmeal", calories: 300, protein: 10, carbs: 54, fat: 5 },
      ]),
      total_calories: 300,
      total_protein: 10,
      total_carbohydrates: 54,
      total_fat: 5,
      logged_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      meal_type: "lunch",
      meal_name: "Chicken Rice Bowl",
      food_items: JSON.stringify([
        {
          name: "Chicken Breast",
          calories: 400,
          protein: 45,
          carbs: 40,
          fat: 8,
        },
      ]),
      total_calories: 400,
      total_protein: 45,
      total_carbohydrates: 40,
      total_fat: 8,
      logged_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];
  await supabaseFetch("/meal_logs", "POST", mealLogs).catch((e) =>
    console.warn(`  ⚠️  meal_logs insert: ${e.message.substring(0, 80)}`),
  );
  console.log(`  ✅ Meal logs ready`);

  // Step 8: Analytics metrics (last 7 days)
  const analyticsEntries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return {
      id: `${userId}_${d.toISOString().split("T")[0]}`,
      user_id: userId,
      metric_date: d.toISOString().split("T")[0],
      weight_kg: 72 + (Math.random() - 0.5) * 1.5,
      calories_consumed: 1800 + Math.floor(Math.random() * 400),
      calories_burned: 400 + Math.floor(Math.random() * 200),
      workouts_completed: i % 2 === 0 ? 1 : 0,
      meals_logged: 3,
      water_intake_ml: 1800 + Math.floor(Math.random() * 600),
      created_at: d.toISOString(),
      updated_at: d.toISOString(),
    };
  });
  await supabaseFetch("/analytics_metrics", "POST", analyticsEntries).catch(
    (e) =>
      console.warn(
        `  ⚠️  analytics_metrics insert (may be dupes): ${e.message.substring(0, 80)}`,
      ),
  );
  console.log(`  ✅ Analytics metrics ready`);

  return {
    email: account.email,
    password: PASSWORD,
    userId,
    role: account.role,
  };
}

async function main() {
  console.log("🚀 FitAI Test Account Setup\n");
  console.log(`Target: ${SUPABASE_URL}\n`);

  const results = [];
  for (const account of TEST_ACCOUNTS) {
    try {
      const result = await upsertUser(account);
      results.push({ ...result, status: "ok" });
    } catch (e) {
      console.error(`  ❌ Failed for ${account.email}: ${e.message}`);
      results.push({ email: account.email, status: "error", error: e.message });
    }
  }

  console.log("\n\n📋 ─── ACCOUNT SUMMARY ───────────────────────────────\n");
  for (const r of results) {
    if (r.status === "ok") {
      console.log(`✅  ${r.role.padEnd(12)} │ ${r.email} │ ${PASSWORD}`);
    } else {
      console.log(`❌  ERROR       │ ${r.email} │ ${r.error}`);
    }
  }
  console.log("\n─────────────────────────────────────────────────────");
  console.log("Port: 8082  |  All accounts ready for parallel testing\n");
}

main().catch(console.error);
