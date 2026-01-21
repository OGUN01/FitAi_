# ⚡ QUICK START - EXECUTE DATABASE MIGRATION NOW

**Time:** 2 minutes  
**Difficulty:** Copy, Paste, Click

---

## 🎯 DO THIS NOW:

### Step 1: Open SQL Editor (Click This Link)

🔗 https://supabase.com/dashboard/project/mqfrwtmkokivoxgukgsz/editor

### Step 2: Copy This SQL (Ctrl+A, Ctrl+C)

```sql
-- FitAI Database Migrations - Execute All At Once
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='workout_preferences' AND column_name='activity_level'
  ) THEN
    ALTER TABLE workout_preferences ADD COLUMN activity_level TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_progress_goals_user_id ON progress_goals(user_id);

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
```

### Step 3: Paste in SQL Editor (Ctrl+V)

### Step 4: Click "RUN" Button (or press Ctrl+Enter)

### Step 5: Verify Success

Run this in your terminal:

```bash
node verify-migrations.js
```

Expected output:

```
✓ progress_goals table exists
✓ activity_level column exists
✓ All migrations successful!
```

---

## ✅ DONE!

That's it! Once you see the success message, you're **100% complete**!

Then:

```bash
# Create your .env file
cp .env.example .env
# Add your credentials, then:
npm start
```

---

**Need help?** Just let me know! I can verify the migration for you.
