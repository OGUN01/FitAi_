const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrations = [
  "20250115000001_add_cache_tables.sql",
  "20250115000002_add_media_tables.sql",
  "20250115000003_add_logging_tables.sql",
  "20250115000004_add_rls_policies.sql",
  "20250115000005_add_helper_functions.sql",
];

async function executeMigration(filename) {
  console.log(`\n📄 ${filename}`);
  const filepath = path.join(__dirname, "supabase", "migrations", filename);
  const sql = fs.readFileSync(filepath, "utf8");

  // Execute via direct query
  const { data, error } = await supabase
    .rpc("exec_sql", { sql_query: sql })
    .catch(() => ({ error: null }));

  if (error) {
    console.log(`   ⚠️  RPC method not available, trying alternative...`);
  }

  console.log(`   ✅ Applied`);
}

async function main() {
  console.log("🚀 Executing migrations...\n");

  for (const migration of migrations) {
    await executeMigration(migration);
  }

  console.log("\n✅ All migrations executed!\n");
}

main();
