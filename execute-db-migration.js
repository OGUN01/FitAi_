#!/usr/bin/env node

/**
 * Execute Database Migrations
 * Uses Supabase service role to execute SQL migrations
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Configuration
const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://mqfrwtmkokivoxgukgsz.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_KEY) {
  console.error("ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required.");
  process.exit(1);
}

console.log("🔄 Starting database migration...");
console.log(`📍 Supabase URL: ${SUPABASE_URL}`);

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeMigrations() {
  try {
    console.log("\n📝 Executing migrations...\n");

    // Migration 1: Create progress_goals table
    console.log("[1/4] Creating progress_goals table...");
    const { error: error1 } = await supabase.rpc("exec", {
      sql: `
        CREATE TABLE IF NOT EXISTS progress_goals (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
          target_weight_kg DECIMAL(5,2),
          target_body_fat_percentage DECIMAL(4,2),
          target_muscle_mass_kg DECIMAL(5,2),
          target_measurements JSONB,
          target_date DATE,
          weekly_workout_goal INTEGER DEFAULT 3,
          daily_calorie_goal INTEGER DEFAULT 2000,
          daily_protein_goal INTEGER DEFAULT 150,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `,
    });

    if (error1 && !error1.message.includes("already exists")) {
      // Try direct query approach
      const { error: directError1 } = await supabase
        .from("progress_goals")
        .select("count")
        .limit(0);

      if (directError1 && directError1.code === "42P01") {
        // Table doesn't exist, need to create it via SQL editor
        console.log(
          "  ⚠️  Cannot create table via API - please use SQL Editor",
        );
        console.log("  📋 SQL to execute:");
        console.log(`
CREATE TABLE IF NOT EXISTS progress_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_weight_kg DECIMAL(5,2),
  target_body_fat_percentage DECIMAL(4,2),
  target_muscle_mass_kg DECIMAL(5,2),
  target_measurements JSONB,
  target_date DATE,
  weekly_workout_goal INTEGER DEFAULT 3,
  daily_calorie_goal INTEGER DEFAULT 2000,
  daily_protein_goal INTEGER DEFAULT 150,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
        `);
      } else {
        console.log("  ✅ Table already exists or created successfully");
      }
    } else {
      console.log("  ✅ Table created successfully");
    }

    // Migration 2: Add activity_level column
    console.log(
      "\n[2/4] Adding activity_level column to workout_preferences...",
    );
    const { data: columns, error: columnCheckError } = await supabase
      .from("workout_preferences")
      .select("*")
      .limit(0);

    if (!columnCheckError) {
      console.log("  ✅ workout_preferences table accessible");
      console.log("  ℹ️  Column addition requires SQL Editor access");
      console.log("  📋 SQL to execute:");
      console.log(`
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='workout_preferences' AND column_name='activity_level'
  ) THEN
    ALTER TABLE workout_preferences ADD COLUMN activity_level TEXT;
  END IF;
END $$;
      `);
    }

    // Migration 3: Create index
    console.log("\n[3/4] Creating index on progress_goals...");
    console.log("  ℹ️  Index creation requires SQL Editor access");
    console.log("  📋 SQL to execute:");
    console.log(`
CREATE INDEX IF NOT EXISTS idx_progress_goals_user_id ON progress_goals(user_id);
    `);

    // Migration 4: Create trigger
    console.log("\n[4/4] Creating updated_at trigger...");
    console.log("  ℹ️  Trigger creation requires SQL Editor access");
    console.log("  📋 SQL to execute:");
    console.log(`
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_progress_goals_updated_at ON progress_goals;
CREATE TRIGGER update_progress_goals_updated_at
    BEFORE UPDATE ON progress_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  MANUAL ACTION REQUIRED\n");
    console.log(
      "The Supabase client API does not support DDL statements (CREATE TABLE, ALTER TABLE, etc.)",
    );
    console.log(
      "You need to execute the migrations manually via the SQL Editor.\n",
    );
    console.log("📋 Steps to complete migration:\n");
    console.log(
      "1. Go to: https://supabase.com/dashboard/project/mqfrwtmkokivoxgukgsz/editor",
    );
    console.log('2. Click "New Query" or open SQL Editor');
    console.log("3. Copy the contents of database-migrations.sql");
    console.log("4. Paste into the SQL Editor");
    console.log('5. Click "Run" or press Ctrl+Enter');
    console.log("6. Verify success with: node verify-migrations.js");
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

// Run migrations
executeMigrations();
