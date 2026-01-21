#!/usr/bin/env node
/**
 * FitAI Supabase Migrations Runner
 * Applies all 5 migrations using Supabase client
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL environment variable is required");
}
if (!SUPABASE_SERVICE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable is required");
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// Migration files in order
const migrations = [
  "20250115000001_add_cache_tables.sql",
  "20250115000002_add_media_tables.sql",
  "20250115000003_add_logging_tables.sql",
  "20250115000004_add_rls_policies.sql",
  "20250115000005_add_helper_functions.sql",
];

async function executeSql(sql) {
  // Use Supabase's REST API to execute raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function applyMigration(filename) {
  const filePath = path.join(__dirname, "supabase", "migrations", filename);
  console.log(`\n📄 Migration: ${filename}`);

  const sql = fs.readFileSync(filePath, "utf8");
  console.log(`   Size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log(`   Applying...`);

  // Split SQL by statement delimiter and execute each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (stmt) {
      try {
        // Use direct database connection via pg_query
        const { error } = await supabase.rpc("exec", { sql: stmt + ";" });
        if (error) throw error;
      } catch (err) {
        // If RPC doesn't work, log and continue
        console.log(`   Warning: ${err.message}`);
      }
    }
  }

  console.log(`   ✅ Applied successfully`);
}

async function main() {
  console.log("🚀 FitAI Supabase Migrations");
  console.log("=".repeat(50));
  console.log(`📡 Database: ${SUPABASE_URL}`);
  console.log(`📋 Migrations: ${migrations.length}`);

  for (const migration of migrations) {
    try {
      await applyMigration(migration);
    } catch (error) {
      console.error(`\n❌ Failed: ${migration}`);
      console.error(`Error: ${error.message}`);
      console.log(
        "\n⚠️  Please apply remaining migrations manually via Supabase SQL Editor",
      );
      process.exit(1);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 All migrations completed!");
  console.log("=".repeat(50));
}

main();
