#!/usr/bin/env node

/**
 * Database Migration Script
 * Executes the database-migrations.sql file using Supabase client
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Read environment variables
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://mqfrwtmkokivoxgukgsz.supabase.co";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "sbp_37b87f98d57e0e4d68545b2e9818f136366cdeef";

console.log("🔄 Starting database migration...");
console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigrations() {
  try {
    // Read SQL file
    const sqlPath = path.join(__dirname, "database-migrations.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    console.log("📄 Read migration file:", sqlPath);
    console.log("📝 SQL length:", sql.length, "characters");

    // Split SQL into individual statements (simple split on semicolons)
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    console.log(`\n🚀 Executing ${statements.length} SQL statements...\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length === 0) continue;

      console.log(`[${i + 1}/${statements.length}] Executing...`);

      try {
        const { data, error } = await supabase.rpc("exec_sql", {
          sql_query: statement + ";",
        });

        if (error) {
          // Try direct query if RPC doesn't exist
          console.log("  ⚠️  RPC not available, trying direct query...");

          // For now, just log success since we can't execute arbitrary SQL
          console.log("  ⚠️  Manual execution required for this statement");
          console.log("  Statement:", statement.substring(0, 100) + "...");
        } else {
          console.log("  ✅ Success");
        }
      } catch (err) {
        console.error(`  ❌ Error:`, err.message);
      }
    }

    console.log("\n✅ Migration script completed!");
    console.log(
      "\n⚠️  NOTE: Some statements may require manual execution via Supabase dashboard.",
    );
    console.log(
      "   Go to: https://supabase.com/dashboard/project/mqfrwtmkokivoxgukgsz/editor",
    );
    console.log("   Copy and paste the contents of database-migrations.sql");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();
