# Data Categories → Supabase Table Mapping

## Complete Single Source of Truth Architecture

> **Last Updated**: 2026-01-10
> **Migrations Applied**: `create_daily_health_logs`, `create_user_streaks`

---

## 15 Data Categories → Supabase Tables

| # | Data Category | Zustand Store | Supabase Table | Key Column(s) | Status |
|---|--------------|---------------|----------------|---------------|--------|
| 1 | **Streak** | `achievementStore` | `user_streaks` | `current_streak`, `longest_streak` | ✅ NEW |
| 2 | **Hydration** | `hydrationStore` | `daily_health_logs` | `water_intake_ml`, `water_goal_ml` | ✅ NEW |
| 3 | **Selected Day** | `appStateStore` | N/A (client-only) | - | ✅ |
| 4 | **Steps** | `healthDataStore` | `daily_health_logs` | `steps`, `steps_goal` | ✅ NEW |
| 5 | **Sleep** | `healthDataStore` | `daily_health_logs` | `sleep_hours`, `sleep_quality` | ✅ NEW |
| 6 | **Heart Rate** | `healthDataStore` | `daily_health_logs` | `resting_heart_rate`, `avg_heart_rate` | ✅ NEW |
| 7 | **Calories Burned** | `healthDataStore` | `daily_health_logs` | `active_calories`, `calories_goal` | ✅ NEW |
| 8 | **Calories Consumed** | `nutritionStore` | `meal_logs` | `total_calories` | ✅ |
| 9 | **Calorie Goal** | `useCalculatedMetrics` | `advanced_review` | `daily_calories` | ✅ |
| 10 | **Macro Targets** | `useCalculatedMetrics` | `advanced_review` | `daily_protein_g`, `daily_carbs_g`, `daily_fat_g` | ✅ |
| 11 | **Weight Current** | `profileStore` | `body_analysis` | `current_weight_kg` | ✅ |
| 12 | **Weight Target** | `profileStore` | `body_analysis` | `target_weight_kg` | ✅ |
| 13 | **Workout Progress** | `fitnessStore` | `workout_sessions` | `is_completed`, `exercises` | ✅ |
| 14 | **Meal Progress** | `nutritionStore` | `meal_logs` | `logged_at` | ✅ |
| 15 | **User Stats** | `useUserStats()` | Multiple (aggregated) | - | ✅ |

---

## NEW Tables Created

### `daily_health_logs` - Daily Health Metrics (SINGLE SOURCE)
```sql
CREATE TABLE daily_health_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  log_date DATE NOT NULL,
  
  -- Hydration (Category #2)
  water_intake_ml INTEGER DEFAULT 0,    -- SINGLE SOURCE
  water_goal_ml INTEGER,                 -- SINGLE SOURCE
  
  -- Steps (Category #4)
  steps INTEGER DEFAULT 0,               -- SINGLE SOURCE
  steps_goal INTEGER,                    -- SINGLE SOURCE
  
  -- Sleep (Category #5)
  sleep_hours NUMERIC(4,2),              -- SINGLE SOURCE
  sleep_quality TEXT,                    -- SINGLE SOURCE
  sleep_start_time TIME,
  sleep_end_time TIME,
  
  -- Heart Rate (Category #6)
  resting_heart_rate INTEGER,            -- SINGLE SOURCE
  avg_heart_rate INTEGER,
  max_heart_rate INTEGER,
  
  -- Calories Burned (Category #7)
  active_calories INTEGER DEFAULT 0,     -- SINGLE SOURCE
  calories_goal INTEGER,                 -- SINGLE SOURCE
  
  -- Metadata
  data_source TEXT DEFAULT 'manual',     -- apple_health, google_fit, etc.
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(user_id, log_date)              -- One entry per user per day
);
```

### `user_streaks` - Activity Streaks (SINGLE SOURCE)
```sql
CREATE TABLE user_streaks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Streak Data (Category #1)
  current_streak INTEGER DEFAULT 0,      -- SINGLE SOURCE
  longest_streak INTEGER DEFAULT 0,      -- SINGLE SOURCE
  
  -- Tracking
  last_activity_date DATE,
  streak_start_date DATE,
  streak_type TEXT DEFAULT 'any',        -- any, workout, meal, hydration, steps
  
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  
  UNIQUE(user_id, streak_type)           -- One streak per type per user
);
```

---

## Existing Tables (Verified)

### `profiles` - User Identity
| Column | Type | Category |
|--------|------|----------|
| `id` | UUID | PK → auth.users |
| `name`, `first_name`, `last_name` | TEXT | User Identity |
| `age` | INTEGER | Personal Info |
| `gender` | TEXT | Personal Info |
| `country`, `state`, `region` | TEXT | Location |
| `units` | TEXT | Preferences |
| `resting_heart_rate` | INTEGER | Health Baseline |

### `body_analysis` - Physical Measurements
| Column | Type | Category |
|--------|------|----------|
| `height_cm` | NUMERIC | **#11 Weight** |
| `current_weight_kg` | NUMERIC | **#11 Weight** ✅ SINGLE SOURCE |
| `target_weight_kg` | NUMERIC | **#12 Target Weight** ✅ SINGLE SOURCE |
| `body_fat_percentage` | NUMERIC | Body Composition |
| `bmi`, `bmr` | NUMERIC | Calculated |
| `medical_conditions[]` | ARRAY | Health |
| `pregnancy_status` | BOOLEAN | Health |

### `advanced_review` - Calculated Targets
| Column | Type | Category |
|--------|------|----------|
| `daily_calories` | INTEGER | **#9 Calorie Goal** ✅ SINGLE SOURCE |
| `daily_protein_g` | INTEGER | **#10 Macro Targets** ✅ SINGLE SOURCE |
| `daily_carbs_g` | INTEGER | **#10 Macro Targets** ✅ SINGLE SOURCE |
| `daily_fat_g` | INTEGER | **#10 Macro Targets** ✅ SINGLE SOURCE |
| `daily_water_ml` | INTEGER | Water Goal (reference) |
| `calculated_bmi` | NUMERIC | Metabolic |
| `calculated_bmr` | NUMERIC | Metabolic |
| `calculated_tdee` | NUMERIC | Metabolic |
| `heart_rate_zones` | JSONB | HR Zones |
| `health_score` | INTEGER | Overall Score |

### `meal_logs` - Food Tracking
| Column | Type | Category |
|--------|------|----------|
| `total_calories` | INTEGER | **#8 Calories Consumed** ✅ SINGLE SOURCE |
| `total_protein` | NUMERIC | Macros |
| `total_carbohydrates` | NUMERIC | Macros |
| `total_fat` | NUMERIC | Macros |
| `meal_type` | TEXT | breakfast/lunch/dinner/snack |
| `logged_at` | TIMESTAMPTZ | **#14 Meal Progress** |

### `workout_sessions` - Workout Tracking
| Column | Type | Category |
|--------|------|----------|
| `is_completed` | BOOLEAN | **#13 Workout Progress** ✅ SINGLE SOURCE |
| `calories_burned` | INTEGER | Workout Stats |
| `duration` | INTEGER | Workout Stats |
| `exercises` | JSONB | Exercise Details |
| `rating` | INTEGER | User Feedback |

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (Single Source of Truth)                │
├─────────────────────────────────────────────────────────────────────┤
│  profiles          │  body_analysis      │  advanced_review         │
│  daily_health_logs │  user_streaks       │  meal_logs               │
│  workout_sessions  │  diet_preferences   │  workout_preferences     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                      ┌─────────▼─────────┐
                      │    SyncEngine     │
                      │  (bidirectional)  │
                      └─────────┬─────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                       ZUSTAND STORES (Cache)                        │
├─────────────────────────────────────────────────────────────────────┤
│ profileStore │ healthDataStore │ nutritionStore │ fitnessStore      │
│ hydrationStore → daily_health_logs                                  │
│ achievementStore → user_streaks                                     │
│ appStateStore (client-only)                                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                      ┌─────────▼─────────┐
                      │     HOOKS         │
                      │ useCalculatedMetrics │
                      │ useUserStats      │
                      └─────────┬─────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────────┐
│                         UI COMPONENTS                               │
├─────────────────────────────────────────────────────────────────────┤
│ HomeScreen │ DietScreen │ FitnessScreen │ ProgressScreen            │
│ AnalyticsScreen │ ProfileScreen │ Components/*                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Store → Supabase Sync Implementation

### `hydrationStore` → `daily_health_logs`
```typescript
// Save hydration to Supabase
const syncHydration = async () => {
  const { waterIntakeML, dailyGoalML } = useHydrationStore.getState();
  await supabase.from('daily_health_logs').upsert({
    user_id: userId,
    log_date: getTodayDate(),
    water_intake_ml: waterIntakeML,
    water_goal_ml: dailyGoalML
  }, { onConflict: 'user_id,log_date' });
};
```

### `achievementStore` → `user_streaks`
```typescript
// Save streak to Supabase
const syncStreak = async () => {
  const { currentStreak, longestStreak, lastActivityDate } = useAchievementStore.getState();
  await supabase.from('user_streaks').upsert({
    user_id: userId,
    streak_type: 'any',
    current_streak: currentStreak,
    longest_streak: longestStreak,
    last_activity_date: lastActivityDate
  }, { onConflict: 'user_id,streak_type' });
};
```

---

## Zero Fallback Rules

### ✅ ALLOWED
- `value ?? null` - Explicit null for missing optional data
- `data.snake_case ?? data.camelCase` - Schema normalization only
- `value ?? 0` in math (division protection)

### ❌ FORBIDDEN
- `value || defaultValue` for data assignment
- `?? x ?? y ?? z` fallback chains
- Multiple sources for same data category
- Hardcoded goals (10000 steps, 2000 calories, etc.)

---

## Implementation Status

- [x] 15 data categories defined
- [x] All categories have single Supabase source
- [x] `daily_health_logs` table created
- [x] `user_streaks` table created  
- [x] RLS policies enabled on new tables
- [ ] Update `hydrationStore` to sync with `daily_health_logs`
- [ ] Update `achievementStore` to sync with `user_streaks`
- [ ] Update `healthDataStore` to sync with `daily_health_logs`
