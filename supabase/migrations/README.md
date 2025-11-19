# Supabase Database Migrations

## Overview
These migrations set up the complete database schema for the FitAI centralized AI architecture.

## Migration Files

### 1. `20250115000001_add_cache_tables.sql`
**Purpose:** Create cache tables for AI-generated content
**Tables:**
- `workout_cache` - Cached workout plans
- `meal_cache` - Cached meal plans

**Features:**
- Deterministic cache keys (based on input parameters)
- Hit count tracking
- Cost and performance metrics
- Indexes for fast lookups

---

### 2. `20250115000002_add_media_tables.sql`
**Purpose:** Create media registry tables
**Tables:**
- `exercise_media` - Exercise GIFs and demonstration videos
- `diet_media` - Food images and recipe videos

**Features:**
- Dual format support (animation + human demonstration)
- Multiple source tracking (R2, Pexels, Pixabay, YouTube)
- Metadata for quality and file size
- Meal type categorization

---

### 3. `20250115000003_add_logging_tables.sql`
**Purpose:** Create logging and analytics tables
**Tables:**
- `api_logs` - HTTP request/response logging
- `generation_history` - Complete AI generation history

**Features:**
- Request performance tracking
- Cache hit/miss analytics
- AI cost tracking per request
- User feedback collection
- Error logging

---

### 4. `20250115000004_add_rls_policies.sql`
**Purpose:** Enable Row Level Security and create policies
**Policies:**
- Cache tables: Read-only for authenticated, write for service_role
- Media tables: Public read, service_role write
- Logs: Users see only their own data
- Service role has full access

**Modifications:**
- Adds `cache_id` and `generation_id` to existing tables
- Adds media preferences to profiles table
- Adds subscription tier tracking

---

### 5. `20250115000005_add_helper_functions.sql`
**Purpose:** Create utility functions
**Functions:**
- `increment_cache_hit()` - Update cache statistics
- `cleanup_old_cache()` - Remove stale entries (90+ days, <5 hits)
- `get_cache_stats()` - Cache performance metrics
- `get_generation_costs()` - AI cost analytics

**Triggers:**
- Auto-update `updated_at` timestamps on media tables

---

## Running Migrations

### Option 1: Supabase CLI (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations
supabase db push

# Or run specific migration
supabase db push --include-schemas public --include-migrations 20250115000001_add_cache_tables.sql
```

### Option 2: Supabase Dashboard
1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor
2. Navigate to **SQL Editor**
3. Copy-paste each migration file content in order
4. Run each migration sequentially (1 → 2 → 3 → 4 → 5)

### Option 3: Automated Script (Future)
```bash
npm run migrate:supabase
```

---

## Migration Order (CRITICAL)

Migrations **MUST** be run in this exact order:
1. Cache tables (dependencies for policies)
2. Media tables (dependencies for policies)
3. Logging tables (dependencies for policies)
4. RLS policies (references all above tables)
5. Helper functions (uses tables from 1-3)

**Do NOT run out of order or skip migrations!**

---

## Rollback

Each migration should have a corresponding rollback:

### Rollback Migration 5
```sql
DROP FUNCTION IF EXISTS increment_cache_hit CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_cache CASCADE;
DROP FUNCTION IF EXISTS get_cache_stats CASCADE;
DROP FUNCTION IF EXISTS get_generation_costs CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

### Rollback Migration 4
```sql
-- Disable RLS
ALTER TABLE workout_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE meal_cache DISABLE ROW LEVEL SECURITY;
-- ... (drop all policies)
```

### Rollback Migration 3
```sql
DROP TABLE IF EXISTS generation_history CASCADE;
DROP TABLE IF EXISTS api_logs CASCADE;
```

### Rollback Migration 2
```sql
DROP TABLE IF EXISTS diet_media CASCADE;
DROP TABLE IF EXISTS exercise_media CASCADE;
```

### Rollback Migration 1
```sql
DROP TABLE IF EXISTS meal_cache CASCADE;
DROP TABLE IF EXISTS workout_cache CASCADE;
```

---

## Testing Migrations

After running all migrations, verify:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('workout_cache', 'meal_cache', 'exercise_media',
                     'diet_media', 'api_logs', 'generation_history');

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('workout_cache', 'meal_cache');

-- Test helper functions
SELECT * FROM get_cache_stats();
SELECT * FROM get_generation_costs();
```

---

## Schema Size Estimates

Based on ARCHITECTURE.md projections for 5,000 users:

| Table | Estimated Size | Notes |
|-------|---------------|-------|
| workout_cache | 2-5 MB | ~500 popular combinations × 5KB |
| meal_cache | 2-4 MB | ~500 popular combinations × 4KB |
| exercise_media | 5-10 MB | ~200 exercises × metadata |
| diet_media | 5-10 MB | ~500 foods × metadata |
| api_logs | 50-100 MB | ~1M requests × 100 bytes |
| generation_history | 50-100 MB | ~50K generations × 2KB |
| **Total** | **~150-200 MB** | Well within 500MB free tier |

---

## Maintenance

### Weekly
- None required (auto-cleanup via `cleanup_old_cache()`)

### Monthly
- Review `get_cache_stats()` for optimization opportunities
- Check `get_generation_costs()` for budget tracking

### Quarterly
- Archive old api_logs (>90 days) to separate table
- Analyze cache hit rates and adjust strategy

---

**Status:** Migrations created, pending application to database
**Created:** 2025-11-14
**Version:** 2.0
