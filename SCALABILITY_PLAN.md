# FitAI Backend Scalability Plan

**Analysis Date:** 2025-12-29
**Based On:** Migration files + RALPH backend analysis
**Project Ref:** mqfrwtmkokivoxgukgsz

---

## Executive Summary

**Current State:** 10 tables exist (onboarding + cache + media + logging)
**Critical Gap:** **Missing 4 essential tables** for production scalability
**Scalability Risk:** HIGH - User data will be lost on app reinstall

---

## Current Database Schema (What EXISTS)

### ✅ Onboarding Tables (6 tables) - COMPLETE
1. **profiles** - User personal info (Tab 1)
2. **diet_preferences** - Diet settings (Tab 2)
3. **body_analysis** - Body metrics & goals (Tab 3)
4. **workout_preferences** - Fitness preferences (Tab 4)
5. **advanced_review** - Calculated metrics (Tab 5)
6. **onboarding_progress** - Flow tracking

### ✅ Cache Tables (2 tables) - EXIST BUT INCOMPLETE
7. **workout_cache** - Cached AI workout responses (NO user_id!)
8. **meal_cache** - Cached AI meal responses (NO user_id!)

### ✅ Media Tables (2 tables) - COMPLETE
9. **exercise_media** - Exercise videos/animations
10. **diet_media** - Food images/recipes

### ✅ Logging Tables (2 tables) - COMPLETE
11. **api_logs** - API request tracking
12. **generation_history** - AI generation audit trail

---

## Critical Missing Tables (BLOCKERS)

### ❌ Table 13: `user_workout_plans` - MISSING
**Impact:** Workout plans are device-local only (Zustand/AsyncStorage)

**Risk:**
- User reinstalls app → Plans lost ❌
- User switches devices → Plans not synced ❌
- Must regenerate → Costs money 💰

**Required Schema:**
```sql
CREATE TABLE user_workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Plan data
  plan_data JSONB NOT NULL,
  plan_version INTEGER DEFAULT 1,

  -- Generation metadata
  generated_from JSONB, -- Input params used
  model_used TEXT,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,
  completion_percentage INTEGER DEFAULT 0,

  -- User feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  difficulty_feedback TEXT CHECK (difficulty_feedback IN ('too_easy', 'just_right', 'too_hard')),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Only one active plan per user
  UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_user_workout_plans_user_id ON user_workout_plans(user_id);
CREATE INDEX idx_user_workout_plans_active ON user_workout_plans(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_workout_plans_expires ON user_workout_plans(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE user_workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plans"
  ON user_workout_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own workout plans"
  ON user_workout_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Scalability Impact:**
- 1M users × 5KB per plan = 5GB storage
- Plan versioning: 10M records @ 5KB = 50GB (manageable with partitioning)

---

### ❌ Table 14: `user_meal_plans` - MISSING
**Impact:** Meal plans are device-local only

**Risk:** Same as workout plans - data loss on reinstall

**Required Schema:**
```sql
CREATE TABLE user_meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Plan data
  plan_data JSONB NOT NULL, -- 7 days × 3-4 meals
  plan_version INTEGER DEFAULT 1,

  -- Generation metadata
  generated_from JSONB,
  model_used TEXT,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,
  adherence_percentage INTEGER DEFAULT 0,

  -- User feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  liked_meals TEXT[], -- Array of meal IDs user enjoyed
  disliked_meals TEXT[], -- Array of meal IDs user didn't like

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_user_meal_plans_user_id ON user_meal_plans(user_id);
CREATE INDEX idx_user_meal_plans_active ON user_meal_plans(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_meal_plans_expires ON user_meal_plans(expires_at) WHERE expires_at IS NOT NULL;

-- RLS
ALTER TABLE user_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plans"
  ON user_meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal plans"
  ON user_meal_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Scalability Impact:**
- 1M users × 15KB per plan (21 meals) = 15GB storage
- Meal preferences learned over time improve AI quality

---

### ❌ Table 15: `workout_sessions` - MISSING
**Impact:** Workout history not persisted

**Risk:**
- No progress tracking (weight increases, rep improvements) ❌
- Can't show "You're 20% stronger than 4 weeks ago" ❌
- Analytics charts empty ❌

**Required Schema:**
```sql
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES user_workout_plans(id) ON DELETE SET NULL,

  -- Session info
  workout_name TEXT,
  workout_type TEXT,
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  total_duration_minutes INTEGER,

  -- Exercises completed (array of objects)
  exercises_completed JSONB, -- [{ exerciseId, sets: [{ reps, weight_kg, completed_at, rest_seconds }] }]

  -- Session metrics
  total_sets INTEGER,
  total_reps INTEGER,
  total_volume_kg INTEGER, -- Sum of (weight × reps)
  calories_burned INTEGER,
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,

  -- User feedback
  perceived_exertion INTEGER CHECK (perceived_exertion >= 1 AND perceived_exertion <= 10), -- RPE scale
  difficulty_rating TEXT CHECK (difficulty_rating IN ('too_easy', 'just_right', 'too_hard')),
  enjoyment_rating INTEGER CHECK (enjoyment_rating >= 1 AND enjoyment_rating <= 5),
  notes TEXT,

  -- Completion status
  is_completed BOOLEAN DEFAULT false,
  completion_percentage INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_user_date ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_workout_sessions_completed ON workout_sessions(user_id, is_completed) WHERE is_completed = true;

-- Partitioning for scalability (by month)
-- Future: Partition by range on started_at for faster queries

-- RLS
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own workout sessions"
  ON workout_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Scalability Impact:**
- Active user does 4 workouts/week × 52 weeks = 208 sessions/year
- 1M users × 208 sessions × 2KB = 416GB/year
- **Mitigation:** Partition by month, archive old data after 2 years

---

### ❌ Table 16: `meal_logs` - MISSING
**Impact:** Meal consumption not tracked

**Risk:**
- Can't calculate actual calories consumed ❌
- Can't show "You ate 1,850 cal vs 2,000 target" ❌
- No nutrition adherence tracking ❌

**Required Schema:**
```sql
CREATE TABLE meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_plan_id UUID REFERENCES user_meal_plans(id) ON DELETE SET NULL,

  -- Meal info
  logged_at TIMESTAMP NOT NULL DEFAULT NOW(),
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),

  -- From plan or custom
  from_plan BOOLEAN DEFAULT true,
  plan_meal_id TEXT, -- Reference to meal in plan JSON
  custom_meal_name TEXT,

  -- Portion adjustment
  portion_multiplier DECIMAL(3,2) DEFAULT 1.0, -- 0.5 = half, 2.0 = double

  -- Actual macros (calculated from plan or entered manually)
  calories DECIMAL(6,1),
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  fiber_g DECIMAL(5,1),

  -- User feedback
  enjoyment_rating INTEGER CHECK (enjoyment_rating >= 1 AND enjoyment_rating <= 5),
  would_eat_again BOOLEAN,
  notes TEXT,

  -- Photo (optional)
  photo_url TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_meal_logs_user_id ON meal_logs(user_id);
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, logged_at DESC);
CREATE INDEX idx_meal_logs_meal_type ON meal_logs(user_id, meal_type);

-- Partitioning by month for scalability
-- Future: Convert to partitioned table

-- RLS
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal logs"
  ON meal_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own meal logs"
  ON meal_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Scalability Impact:**
- Active user logs 3 meals/day × 365 days = 1,095 meals/year
- 1M users × 1,095 meals × 1KB = 1.095TB/year
- **Mitigation:** Partition by month, aggregate to daily summaries after 90 days

---

## Recommended: Analytics Tables (For Performance)

### Table 17: `user_metrics_daily` (Recommended)
**Purpose:** Pre-aggregated daily metrics for fast analytics

**Benefits:**
- 100x faster chart queries
- Reduced database load
- Easier to reason about trends

```sql
CREATE TABLE user_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Body metrics
  weight_kg DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  waist_cm DECIMAL(5,2),

  -- Nutrition metrics
  calories_consumed DECIMAL(6,1),
  protein_g DECIMAL(5,1),
  carbs_g DECIMAL(5,1),
  fat_g DECIMAL(5,1),
  water_ml INTEGER,
  meals_logged INTEGER,

  -- Fitness metrics
  workouts_completed INTEGER DEFAULT 0,
  total_workout_minutes INTEGER DEFAULT 0,
  calories_burned DECIMAL(6,1),
  total_volume_kg INTEGER,

  -- Activity metrics (from HealthKit)
  steps INTEGER,
  active_minutes INTEGER,
  sleep_hours DECIMAL(3,1),

  -- Adherence
  meal_plan_adherence_percentage INTEGER,
  workout_plan_adherence_percentage INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_metrics_daily_user_date ON user_metrics_daily(user_id, date DESC);

-- RLS
ALTER TABLE user_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily metrics"
  ON user_metrics_daily FOR SELECT
  USING (auth.uid() = user_id);

-- Only system can write (via cron job aggregation)
CREATE POLICY "Service role can insert daily metrics"
  ON user_metrics_daily FOR INSERT
  WITH CHECK (true);
```

**Scalability Impact:**
- 1M users × 365 days = 365M rows/year
- @ 500 bytes/row = 182GB/year
- **Benefit:** Charts load in <100ms vs 10+ seconds from raw logs

---

## Critical Issues with Current Schema

### 🚨 Issue 1: Cache Tables Have NO user_id

**Current Schema:**
```sql
CREATE TABLE workout_cache (
  id UUID PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  workout_data JSONB NOT NULL,
  -- NO user_id column!
  ...
);
```

**Problem:**
- Cache is global, not user-specific
- Can't track which user used which cached plan
- Can't enforce "1 generation/month" for free tier
- Privacy concern: User A might get User B's plan if params match

**Fix Required:**
```sql
ALTER TABLE workout_cache
  ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE meal_cache
  ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX idx_workout_cache_user_id ON workout_cache(user_id);
CREATE INDEX idx_meal_cache_user_id ON meal_cache(user_id);
```

---

### 🚨 Issue 2: No Cascade Delete on Cache Tables

**Problem:** If user deletes account, cache entries remain

**Fix:**
Already suggested above - add ON DELETE CASCADE to user_id foreign key

---

### 🚨 Issue 3: Missing TTL/Expiration Logic

**Current Schema:** Cache tables have no automatic cleanup

**Problem:**
- Cache grows indefinitely
- Old plans never expire
- Storage costs increase

**Fix Required:**
```sql
ALTER TABLE workout_cache
  ADD COLUMN expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '30 days');

ALTER TABLE meal_cache
  ADD COLUMN expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days');

-- Cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM workout_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  DELETE FROM meal_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Run daily via pg_cron or Supabase Edge Function
```

---

## Scalability Architecture Recommendations

### 1. Partitioning Strategy

**Tables to Partition:**
- `workout_sessions` - Partition by month (started_at)
- `meal_logs` - Partition by month (logged_at)
- `api_logs` - Partition by month (created_at)

**Why:**
- 1M users × 1000 logs/year = 1B rows (unmanageable without partitioning)
- Partitioning by month = 12 partitions × manageable size
- Old partitions can be archived to cheaper storage

**Implementation:**
```sql
-- Convert workout_sessions to partitioned table
CREATE TABLE workout_sessions_new (LIKE workout_sessions INCLUDING ALL)
PARTITION BY RANGE (started_at);

-- Create monthly partitions
CREATE TABLE workout_sessions_2025_01 PARTITION OF workout_sessions_new
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE workout_sessions_2025_02 PARTITION OF workout_sessions_new
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
-- ... etc

-- Migrate data
INSERT INTO workout_sessions_new SELECT * FROM workout_sessions;

-- Atomic swap
ALTER TABLE workout_sessions RENAME TO workout_sessions_old;
ALTER TABLE workout_sessions_new RENAME TO workout_sessions;
```

---

### 2. Indexing Strategy

**Current Indexes:** Basic (user_id, created_at)
**Missing Indexes:**

```sql
-- For plan expiration checks (cron job)
CREATE INDEX idx_user_workout_plans_expiring ON user_workout_plans(expires_at)
  WHERE expires_at IS NOT NULL AND is_active = true;

CREATE INDEX idx_user_meal_plans_expiring ON user_meal_plans(expires_at)
  WHERE expires_at IS NOT NULL AND is_active = true;

-- For analytics queries (last 7/30/90 days)
CREATE INDEX idx_workout_sessions_recent ON workout_sessions(user_id, started_at DESC)
  WHERE started_at > NOW() - INTERVAL '90 days';

CREATE INDEX idx_meal_logs_recent ON meal_logs(user_id, logged_at DESC)
  WHERE logged_at > NOW() - INTERVAL '90 days';

-- For generation rate limiting
CREATE INDEX idx_generation_history_user_month ON generation_history(
  user_id,
  generation_type,
  date_trunc('month', created_at)
);
```

---

### 3. Data Retention Policy

**Hot Data (Fast SSD):**
- Last 90 days of logs (workout_sessions, meal_logs, api_logs)
- All active plans (user_workout_plans, user_meal_plans)
- All onboarding data (profiles, preferences)

**Warm Data (Standard Storage):**
- 90 days - 2 years: Aggregated daily metrics only
- Full logs archived to object storage (S3/R2)

**Cold Data (Archive):**
- 2+ years: Moved to Supabase Archive or S3 Glacier
- Can be restored on user request

**Implementation:**
```sql
-- Archive old sessions (run monthly)
CREATE OR REPLACE FUNCTION archive_old_sessions()
RETURNS void AS $$
BEGIN
  -- Copy to archive table (in Supabase Archive tier)
  INSERT INTO workout_sessions_archive
  SELECT * FROM workout_sessions
  WHERE started_at < NOW() - INTERVAL '2 years';

  -- Delete from hot storage
  DELETE FROM workout_sessions
  WHERE started_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
```

---

### 4. Caching Strategy

**Multi-Layer Cache:**

```
User Request
  ↓
Client Cache (AsyncStorage) - 5 min TTL
  ↓ (if miss)
Cloudflare Workers KV - 1 hour TTL
  ↓ (if miss)
Supabase Database Cache Tables - 30 day TTL
  ↓ (if miss)
AI Generation (Gemini) - Cost $$$
```

**Cost Savings:**
- 90% cache hit rate = 10x cost reduction
- Client cache: Free
- Workers KV: ~$0.50/1M reads
- Database: Included in Supabase plan
- AI generation: $0.001 per call

---

### 5. Real-time Sync Strategy

**Tables to Sync in Real-time:**
- `profiles` - Profile changes
- `user_workout_plans` - New plan generated
- `user_meal_plans` - New plan generated

**Implementation:**
```typescript
// Client-side
const subscription = supabase
  .channel('user_data_changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_workout_plans',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    fitnessStore.setState({ weeklyWorkoutPlan: payload.new.plan_data });
  })
  .subscribe();
```

---

## Migration Plan

### Phase 1: Critical Tables (Week 1)
```bash
# Create migration
supabase migration new add_user_plan_tables

# Add to migration file:
# - user_workout_plans
# - user_meal_plans
# - workout_sessions
# - meal_logs

# Apply
supabase db push
```

### Phase 2: Fix Cache Tables (Week 1)
```bash
supabase migration new fix_cache_tables

# Add:
# - ALTER TABLE workout_cache ADD COLUMN user_id
# - ALTER TABLE meal_cache ADD COLUMN user_id
# - Add expires_at columns
# - Add cleanup function
```

### Phase 3: Analytics Tables (Week 2)
```bash
supabase migration new add_analytics_tables

# Add:
# - user_metrics_daily
# - Aggregation functions
# - Cron job setup (via Supabase pg_cron extension)
```

### Phase 4: Partitioning (Week 3)
```bash
supabase migration new add_partitioning

# Convert to partitioned tables:
# - workout_sessions
# - meal_logs
# - api_logs
```

### Phase 5: Optimization (Week 4)
```bash
supabase migration new add_optimizations

# Add:
# - Additional indexes
# - Archive functions
# - Performance tuning
```

---

## Estimated Storage Growth

### Year 1 Projections

**Assumption:** 100,000 active users

| Table | Rows/Year | Size/Row | Total Size |
|-------|-----------|----------|------------|
| profiles | 100,000 | 2KB | 200MB |
| diet_preferences | 100,000 | 1KB | 100MB |
| body_analysis | 100,000 | 2KB | 200MB |
| workout_preferences | 100,000 | 1KB | 100MB |
| advanced_review | 100,000 | 2KB | 200MB |
| user_workout_plans | 500,000 | 5KB | 2.5GB |
| user_meal_plans | 500,000 | 15KB | 7.5GB |
| workout_sessions | 20.8M | 2KB | 41.6GB |
| meal_logs | 109.5M | 1KB | 109.5GB |
| generation_history | 200,000 | 3KB | 600MB |
| user_metrics_daily | 36.5M | 500B | 18.25GB |
| **TOTAL** | | | **~180GB** |

**Supabase Free Tier:** 500MB
**Supabase Pro Tier:** 8GB included, $0.125/GB after
**Cost at 100K users:** ~$22/month for storage

**At 1M users:** ~1.8TB = $225/month storage cost (manageable)

---

## Performance Targets

### Query Performance Goals

| Query Type | Target Latency | Current | With Optimizations |
|------------|----------------|---------|-------------------|
| Load user profile | <100ms | ~200ms | <50ms (with indexes) |
| Load workout plan | <100ms | N/A | <50ms (with user_workout_plans) |
| Load meal plan | <100ms | N/A | <50ms (with user_meal_plans) |
| Load analytics (30 days) | <500ms | N/A | <200ms (with daily metrics) |
| Generate AI plan | <5000ms | ~3000ms | Same (external API) |
| Log workout session | <200ms | N/A | <100ms (with partitioning) |

### Throughput Targets

- **Concurrent users:** 10,000 simultaneous
- **Requests/second:** 1,000 read, 100 write
- **AI generations/hour:** 500 (with rate limiting)

---

## Next Steps

1. **Create migration files** for 4 critical tables
2. **Fix cache tables** (add user_id, expires_at)
3. **Deploy migrations** to Supabase
4. **Update app code** to use new tables instead of Zustand
5. **Add cron jobs** for cache cleanup and daily aggregation
6. **Monitor performance** and optimize indexes
7. **Plan partitioning** for when log tables exceed 10M rows

---

## Conclusion

**Current State:** 70% ready for production
**After implementing plan:** 95% production-ready

**Critical Path:**
1. Add 4 missing tables (user_workout_plans, user_meal_plans, workout_sessions, meal_logs)
2. Fix cache tables (add user_id)
3. Deploy and migrate app code

**Timeline:** 2-3 weeks for full implementation

**Scalability:** Can handle 1M users with proper partitioning and indexing
