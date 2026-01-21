// Check if onboarding tables exist in Supabase
const https = require("https");

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!ANON_KEY) {
  throw new Error("SUPABASE_ANON_KEY environment variable is required");
}

// Extract hostname from URL
const supabaseHost = SUPABASE_URL.replace("https://", "").replace(
  "http://",
  "",
);

const tablesToCheck = [
  "profiles",
  "diet_preferences",
  "body_analysis",
  "workout_preferences",
  "advanced_review",
  "onboarding_progress",
];

async function checkTable(tableName) {
  return new Promise((resolve) => {
    const options = {
      hostname: supabaseHost,
      path: `/rest/v1/${tableName}?limit=0`,
      method: "GET",
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode === 200) {
          console.log(`✅ Table "${tableName}" EXISTS`);
          resolve({ table: tableName, exists: true });
        } else if (
          res.statusCode === 404 ||
          (res.statusCode >= 400 &&
            data.includes("relation") &&
            data.includes("does not exist"))
        ) {
          console.log(`❌ Table "${tableName}" DOES NOT EXIST`);
          resolve({ table: tableName, exists: false });
        } else {
          console.log(
            `⚠️  Table "${tableName}": Status ${res.statusCode} - ${data.substring(0, 100)}`,
          );
          resolve({ table: tableName, exists: false, error: data });
        }
      });
    });

    req.on("error", (error) => {
      console.log(`❌ Error checking "${tableName}":`, error.message);
      resolve({ table: tableName, exists: false, error: error.message });
    });

    req.setTimeout(10000, () => {
      console.log(`⏱️  Timeout checking "${tableName}"`);
      req.destroy();
      resolve({ table: tableName, exists: false, error: "timeout" });
    });

    req.end();
  });
}

async function main() {
  console.log("🔍 Checking Onboarding Tables in Supabase...\n");
  console.log(`Project: ${SUPABASE_URL}\n`);

  const results = [];
  for (const table of tablesToCheck) {
    const result = await checkTable(table);
    results.push(result);
  }

  console.log("\n📊 Summary:");
  const existing = results.filter((r) => r.exists);
  const missing = results.filter((r) => !r.exists);

  console.log(`✅ Existing tables: ${existing.length}/${tablesToCheck.length}`);
  if (existing.length > 0) {
    existing.forEach((r) => console.log(`   - ${r.table}`));
  }

  console.log(`❌ Missing tables: ${missing.length}/${tablesToCheck.length}`);
  if (missing.length > 0) {
    missing.forEach((r) => console.log(`   - ${r.table}`));
  }

  if (missing.length > 0) {
    console.log("\n🚨 ACTION REQUIRED: Create missing database tables!");
  } else {
    console.log("\n✅ All onboarding tables exist!");
  }
}

main();
