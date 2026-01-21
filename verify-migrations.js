#!/usr/bin/env node

/**
 * FitAI Database Migration Verification Script
 *
 * This script verifies that all database migrations have been successfully applied.
 * It checks for:
 * - progress_goals table existence
 * - workout_preferences.activity_level column existence
 * - Required indexes
 * - Required triggers
 *
 * Usage:
 *   node verify-migrations.js
 *
 * Requirements:
 *   - SUPABASE_URL environment variable
 *   - SUPABASE_SERVICE_ROLE_KEY environment variable
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, "green");
}

function error(message) {
  log(`✗ ${message}`, "red");
}

function info(message) {
  log(`ℹ ${message}`, "blue");
}

function warn(message) {
  log(`⚠ ${message}`, "yellow");
}

async function verifyMigrations() {
  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    error("Missing required environment variables:");
    if (!process.env.SUPABASE_URL) error("  - SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
      error("  - SUPABASE_SERVICE_ROLE_KEY");
    info(
      "Please create a .env file based on .env.example and fill in your Supabase credentials.",
    );
    process.exit(1);
  }

  log("\n=================================================", "cyan");
  log("FitAI Database Migration Verification", "bold");
  log("=================================================\n", "cyan");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let allPassed = true;
  const results = {
    tables: [],
    columns: [],
    indexes: [],
    triggers: [],
  };

  // Test 1: Check if progress_goals table exists
  log("1. Checking progress_goals table...", "cyan");
  try {
    const { data, error: tableError } = await supabase
      .from("progress_goals")
      .select("id")
      .limit(1);

    if (tableError) {
      if (tableError.code === "42P01") {
        error("   progress_goals table does not exist");
        results.tables.push({ name: "progress_goals", exists: false });
        allPassed = false;
      } else {
        throw tableError;
      }
    } else {
      success("   progress_goals table exists");
      results.tables.push({ name: "progress_goals", exists: true });
    }
  } catch (err) {
    error(`   Error checking progress_goals table: ${err.message}`);
    results.tables.push({
      name: "progress_goals",
      exists: false,
      error: err.message,
    });
    allPassed = false;
  }

  // Test 2: Check if workout_preferences.activity_level column exists
  log("\n2. Checking workout_preferences.activity_level column...", "cyan");
  try {
    const { data, error: columnError } = await supabase.rpc("column_exists", {
      table_name: "workout_preferences",
      column_name: "activity_level",
    });

    if (columnError) {
      // If the function doesn't exist, use a different approach
      warn("   RPC function not available, using alternative check...");

      // Try to query with the column
      const { data: testData, error: testError } = await supabase
        .from("workout_preferences")
        .select("activity_level")
        .limit(1);

      if (testError) {
        if (testError.code === "42703") {
          error(
            "   activity_level column does not exist in workout_preferences",
          );
          results.columns.push({
            table: "workout_preferences",
            column: "activity_level",
            exists: false,
          });
          allPassed = false;
        } else {
          throw testError;
        }
      } else {
        success("   activity_level column exists in workout_preferences");
        results.columns.push({
          table: "workout_preferences",
          column: "activity_level",
          exists: true,
        });
      }
    } else {
      if (data) {
        success("   activity_level column exists in workout_preferences");
        results.columns.push({
          table: "workout_preferences",
          column: "activity_level",
          exists: true,
        });
      } else {
        error("   activity_level column does not exist in workout_preferences");
        results.columns.push({
          table: "workout_preferences",
          column: "activity_level",
          exists: false,
        });
        allPassed = false;
      }
    }
  } catch (err) {
    error(`   Error checking activity_level column: ${err.message}`);
    results.columns.push({
      table: "workout_preferences",
      column: "activity_level",
      exists: false,
      error: err.message,
    });
    allPassed = false;
  }

  // Test 3: Check if index exists (idx_progress_goals_user_id)
  log("\n3. Checking idx_progress_goals_user_id index...", "cyan");
  try {
    const { data, error: indexError } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT EXISTS (
          SELECT 1 
          FROM pg_indexes 
          WHERE indexname = 'idx_progress_goals_user_id'
        ) as exists;
      `,
    });

    if (indexError) {
      warn("   Cannot verify index existence (RPC not available)");
      info("   Manual verification required via Supabase Dashboard");
      results.indexes.push({
        name: "idx_progress_goals_user_id",
        verified: false,
        reason: "RPC not available",
      });
    } else {
      if (data && data[0]?.exists) {
        success("   idx_progress_goals_user_id index exists");
        results.indexes.push({
          name: "idx_progress_goals_user_id",
          exists: true,
        });
      } else {
        warn("   idx_progress_goals_user_id index may not exist");
        results.indexes.push({
          name: "idx_progress_goals_user_id",
          exists: false,
        });
      }
    }
  } catch (err) {
    warn(`   Cannot verify index: ${err.message}`);
    info("   Manual verification required via Supabase Dashboard");
    results.indexes.push({
      name: "idx_progress_goals_user_id",
      verified: false,
      error: err.message,
    });
  }

  // Test 4: Check if trigger exists (update_progress_goals_updated_at)
  log("\n4. Checking update_progress_goals_updated_at trigger...", "cyan");
  try {
    const { data, error: triggerError } = await supabase.rpc("exec_sql", {
      sql: `
        SELECT EXISTS (
          SELECT 1 
          FROM pg_trigger 
          WHERE tgname = 'update_progress_goals_updated_at'
        ) as exists;
      `,
    });

    if (triggerError) {
      warn("   Cannot verify trigger existence (RPC not available)");
      info("   Manual verification required via Supabase Dashboard");
      results.triggers.push({
        name: "update_progress_goals_updated_at",
        verified: false,
        reason: "RPC not available",
      });
    } else {
      if (data && data[0]?.exists) {
        success("   update_progress_goals_updated_at trigger exists");
        results.triggers.push({
          name: "update_progress_goals_updated_at",
          exists: true,
        });
      } else {
        warn("   update_progress_goals_updated_at trigger may not exist");
        results.triggers.push({
          name: "update_progress_goals_updated_at",
          exists: false,
        });
      }
    }
  } catch (err) {
    warn(`   Cannot verify trigger: ${err.message}`);
    info("   Manual verification required via Supabase Dashboard");
    results.triggers.push({
      name: "update_progress_goals_updated_at",
      verified: false,
      error: err.message,
    });
  }

  // Summary
  log("\n=================================================", "cyan");
  log("Verification Summary", "bold");
  log("=================================================\n", "cyan");

  if (allPassed) {
    success("All critical migrations have been applied successfully!\n");
    info("Note: Index and trigger checks may require manual verification");
    info("via the Supabase Dashboard if RPC functions are not available.\n");
  } else {
    error("Some migrations are missing or failed!\n");
    warn("Please run the migrations manually using the MIGRATION_GUIDE.md\n");
    process.exit(1);
  }

  // Detailed results
  log("Detailed Results:", "cyan");
  log(JSON.stringify(results, null, 2));
  log("");
}

// Run verification
verifyMigrations().catch((err) => {
  error(`\nFatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
