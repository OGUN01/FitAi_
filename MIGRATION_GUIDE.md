# FitAI Database Migration Guide

## Overview

This guide provides step-by-step instructions for manually executing the FitAI database migrations. These migrations are required to add new features including progress goal tracking and enhanced workout preferences.

**Migration File:** `database-migrations.sql`  
**Created:** 2026-01-21  
**Status:** Ready for manual execution

---

## What These Migrations Do

The migrations perform the following changes to your Supabase database:

### 1. **Create `progress_goals` Table**

Creates a new table to store user fitness goals including:

- Target weight, body fat percentage, and muscle mass
- Target body measurements (stored as JSON)
- Weekly workout and daily nutrition goals
- Progress tracking with timestamps

### 2. **Add `activity_level` Column**

Adds an `activity_level` column to the existing `workout_preferences` table to store user activity levels (sedentary, lightly active, moderately active, very active, extremely active).

### 3. **Add Performance Index**

Creates an index on `progress_goals.user_id` to optimize queries when fetching user-specific goals.

### 4. **Add `updated_at` Trigger**

Creates a trigger that automatically updates the `updated_at` timestamp whenever a record in the `progress_goals` table is modified.

---

## Prerequisites

Before running the migrations, ensure you have:

1. ✅ Access to your Supabase Dashboard
2. ✅ Admin/Owner permissions on your Supabase project
3. ✅ The `database-migrations.sql` file in your project root
4. ✅ A backup of your database (recommended)

---

## Migration Steps

### Step 1: Access Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your FitAI project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query** to create a new SQL query

### Step 2: Copy Migration SQL

1. Open the `database-migrations.sql` file in your code editor
2. Copy the entire contents of the file
3. Paste it into the SQL Editor in Supabase

### Step 3: Execute the Migration

1. Review the SQL to ensure it's correct
2. Click **Run** (or press Cmd/Ctrl + Enter) to execute the migration
3. Wait for the execution to complete

### Step 4: Verify Success

You should see a success message: `Database migrations completed successfully!`

If you see any errors, refer to the **Troubleshooting** section below.

### Step 5: Verify Migrations Applied

Run the verification script to confirm all migrations were applied:

```bash
node verify-migrations.js
```

This script will check:

- ✓ `progress_goals` table exists
- ✓ `activity_level` column exists in `workout_preferences`
- ✓ Index `idx_progress_goals_user_id` exists
- ✓ Trigger `update_progress_goals_updated_at` exists

---

## Manual Verification (Alternative)

If you prefer to verify manually via the Supabase Dashboard:

### Verify Table Creation

1. Go to **Table Editor** in the Supabase Dashboard
2. Look for the `progress_goals` table in the list
3. Click on it to view its structure

**Expected columns:**

- `id` (uuid, primary key)
- `user_id` (uuid, foreign key to profiles)
- `target_weight_kg` (decimal)
- `target_body_fat_percentage` (decimal)
- `target_muscle_mass_kg` (decimal)
- `target_measurements` (jsonb)
- `target_date` (date)
- `weekly_workout_goal` (integer)
- `daily_calorie_goal` (integer)
- `daily_protein_goal` (integer)
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

### Verify Column Addition

1. Go to **Table Editor**
2. Select the `workout_preferences` table
3. Check that the `activity_level` column exists

### Verify Index

1. Go to **Database** > **Indexes** in the Supabase Dashboard
2. Look for `idx_progress_goals_user_id` in the list
3. Verify it's on the `progress_goals` table, column `user_id`

### Verify Trigger

1. Go to **Database** > **Triggers**
2. Look for `update_progress_goals_updated_at`
3. Verify it's attached to the `progress_goals` table

---

## Rollback Procedures

If you need to rollback the migrations, use the following SQL:

### Rollback Script

```sql
-- WARNING: This will delete all data in the progress_goals table!
-- Make sure you have a backup before running this.

-- 1. Drop trigger
DROP TRIGGER IF EXISTS update_progress_goals_updated_at ON progress_goals;

-- 2. Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 3. Drop index
DROP INDEX IF EXISTS idx_progress_goals_user_id;

-- 4. Remove activity_level column from workout_preferences
ALTER TABLE workout_preferences DROP COLUMN IF EXISTS activity_level;

-- 5. Drop progress_goals table
DROP TABLE IF EXISTS progress_goals;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Database migrations rolled back successfully!';
END $$;
```

**To execute rollback:**

1. Copy the rollback script above
2. Go to Supabase Dashboard > SQL Editor
3. Paste the script into a new query
4. Click **Run**

---

## Troubleshooting

### Error: "relation 'profiles' does not exist"

**Cause:** The `progress_goals` table references a `profiles` table that doesn't exist.

**Solution:**

1. Check if you have a `profiles` or `users` table
2. If you have a `users` table instead, modify the migration:
   ```sql
   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
   ```
3. If you don't have either table, create the profiles table first

### Error: "relation 'workout_preferences' does not exist"

**Cause:** The `workout_preferences` table doesn't exist in your database.

**Solution:**

1. Comment out or remove the `workout_preferences` migration section
2. Create the `workout_preferences` table first, then re-run the migration
3. Or manually add the column later when the table is created

### Error: "permission denied"

**Cause:** You don't have sufficient permissions to create tables/columns.

**Solution:**

1. Ensure you're logged in as the project owner
2. Check your Supabase project permissions
3. Contact your Supabase project admin for access

### Warning: "index already exists"

**Cause:** The migration has been run before, or the index was created manually.

**Solution:** This is safe to ignore. The `CREATE INDEX IF NOT EXISTS` statement prevents errors if the index already exists.

---

## Post-Migration Steps

After successfully running the migrations:

1. ✅ Run the verification script: `node verify-migrations.js`
2. ✅ Update your Row Level Security (RLS) policies for the new `progress_goals` table
3. ✅ Test the new features in your application
4. ✅ Monitor your database performance

### Recommended RLS Policies

Add these policies to secure the `progress_goals` table:

```sql
-- Enable RLS
ALTER TABLE progress_goals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own progress goals
CREATE POLICY "Users can view own progress goals"
  ON progress_goals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own progress goals
CREATE POLICY "Users can insert own progress goals"
  ON progress_goals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own progress goals
CREATE POLICY "Users can update own progress goals"
  ON progress_goals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own progress goals
CREATE POLICY "Users can delete own progress goals"
  ON progress_goals
  FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Environment Variables

Ensure your `.env` file contains the following variables (see `.env.example` for template):

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Workers Configuration
WORKERS_URL=https://fitai-workers.yourname.workers.dev

# Test User (for verification script)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=your_test_password_here
```

---

## Support

If you encounter any issues:

1. Check the **Troubleshooting** section above
2. Review the Supabase logs in Dashboard > Database > Logs
3. Verify your database schema matches the expected structure
4. Check that all prerequisites are met

---

## Migration Checklist

Use this checklist to track your migration progress:

- [ ] Backed up database (if in production)
- [ ] Opened Supabase SQL Editor
- [ ] Copied migration SQL from `database-migrations.sql`
- [ ] Executed migration in SQL Editor
- [ ] Verified success message appeared
- [ ] Ran verification script (`node verify-migrations.js`)
- [ ] All verifications passed
- [ ] Added RLS policies to `progress_goals` table
- [ ] Tested new features in application
- [ ] Monitored database performance

---

**Last Updated:** 2026-01-21  
**Migration File Version:** 1.0  
**Status:** Ready for Production
