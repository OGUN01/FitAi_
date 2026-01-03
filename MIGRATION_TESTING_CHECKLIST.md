# Migration Testing Checklist
**Complete End-to-End Verification for Guest-to-User Data Sync**

---

## 📋 Pre-Migration Verification (Guest Mode)

### Step 1: Complete Onboarding as Guest
- [ ] Complete Tab 1: Personal Info
  - [ ] Name, age, gender filled
  - [ ] Occupation type selected
  - [ ] Sleep/wake times set
- [ ] Complete Tab 2: Diet Preferences
  - [ ] Diet type selected (vegetarian/vegan/non-veg/etc.)
  - [ ] Allergies and restrictions noted
  - [ ] All 14 health habit questions answered
- [ ] Complete Tab 3: Body Analysis
  - [ ] Height and current weight entered
  - [ ] Target weight and timeline set
  - [ ] Medical conditions noted (if any)
- [ ] Complete Tab 4: Workout Preferences
  - [ ] Location selected (home/gym/both)
  - [ ] Equipment selected
  - [ ] Primary goals selected (at least 1)
  - [ ] Experience level selected
  - [ ] Workouts per week set
- [ ] Complete Tab 5: Advanced Review
  - [ ] **CRITICAL**: Verify calculated metrics are showing:
    - [ ] BMI value displayed
    - [ ] BMR (Basal Metabolic Rate) calculated
    - [ ] TDEE (Total Daily Energy Expenditure) calculated
    - [ ] Daily calories recommendation
    - [ ] Macros (Protein/Carbs/Fat in grams)
    - [ ] Water intake (ml per day)
    - [ ] Fiber recommendation
    - [ ] Heart rate zones (Fat burn, Cardio, Peak)
    - [ ] Health score (0-100)
    - [ ] Weekly weight loss rate
    - [ ] Estimated timeline

### Step 2: Verify Guest Data Stored Locally
**Check AsyncStorage via logs:**
```log
✅ [ONBOARDING] Onboarding data saved to local storage (AsyncStorage)
✅ Onboarding marked as complete in AsyncStorage
📊 [useCalculatedMetrics] Found advancedReview with daily_water_ml: XXXX
```

**Expected in logs:**
- [ ] All 5 data types saved to AsyncStorage
- [ ] `advancedReview` contains `daily_water_ml` (proves calculations exist)
- [ ] No errors during onboarding completion

---

## 🔄 Migration Trigger

### Step 3: Trigger Login Flow
- [ ] Click "Generate Diet Plan" or "Generate Workout" button
- [ ] App prompts for login/signup
- [ ] Click "Sign Up" and create new account
- [ ] Successfully log in with new account

### Step 4: Migration Prompt
- [ ] App shows "Sync Your Data" modal/prompt
- [ ] Modal explains guest data will be synced to account
- [ ] Click "Sync Data" button

---

## 🔍 During Migration - Critical Logs to Watch

### Expected Log Sequence:
```log
[DataBridge] migrateGuestToUser: <userId>
[DataBridge] Loaded local data for migration: {...}

[DataBridge] Migrating personalInfo...
✅ [DataBridge] personalInfo migrated successfully

[DataBridge] Migrating dietPreferences...
✅ [DataBridge] dietPreferences migrated successfully

[DataBridge] Migrating bodyAnalysis...
[DataBridge] Transforming bodyAnalysis data: {...}
[DataBridge] Transformed bodyAnalysis: {...}
✅ [DataBridge] bodyAnalysis migrated successfully

[DataBridge] Migrating workoutPreferences...
[DataBridge] Transforming workoutPreferences data: {...}
[DataBridge] Transformed workoutPreferences: {...}
✅ [DataBridge] workoutPreferences migrated successfully

[DataBridge] Migrating advancedReview...
✅ [DataBridge] advancedReview migrated successfully

✅ [DataBridge] Guest data cleared after successful migration
[DataBridge] Migration result: {success: true, migratedKeys: [...], errors: []}
```

### Critical Checks During Migration:

#### ✅ Personal Info Migration
- [ ] Log shows: `[DataBridge] Migrating personalInfo...`
- [ ] Log shows: `✅ [DataBridge] personalInfo migrated successfully`
- [ ] No errors in migration result

#### ✅ Diet Preferences Migration
- [ ] Log shows: `[DataBridge] Migrating dietPreferences...`
- [ ] Log shows: `✅ [DataBridge] dietPreferences migrated successfully`
- [ ] All 30 fields preserved (diet type, allergies, health habits)

#### ✅ Body Analysis Migration (WITH TRANSFORMATION)
- [ ] Log shows: `[DataBridge] Transforming bodyAnalysis data`
- [ ] **VERIFY TRANSFORMATION**: Old format → New format
  ```
  OLD: { measurements: { height: 172, weight: 92 } }
  NEW: { height_cm: 172, current_weight_kg: 92 }
  ```
- [ ] Log shows transformed data with `height_cm`, `current_weight_kg`, `target_weight_kg`
- [ ] Log shows: `✅ [DataBridge] bodyAnalysis migrated successfully`

#### ✅ Workout Preferences Migration (WITH TRANSFORMATION)
- [ ] Log shows: `[DataBridge] Transforming workoutPreferences data`
- [ ] **VERIFY TRANSFORMATION**: Old format → New format
  ```
  OLD: { experience_level: 'advanced', workoutsPerWeek: 7 }
  NEW: { intensity: 'advanced', workout_frequency_per_week: 7 }
  ```
- [ ] Log shows: `✅ [DataBridge] workoutPreferences migrated successfully`

#### ✅ Advanced Review Migration (NO TRANSFORMATION - DIRECT COPY)
- [ ] Log shows: `[DataBridge] Migrating advancedReview...`
- [ ] **CRITICAL**: All 40+ calculated fields should be migrated:
  - BMI, BMR, TDEE
  - Daily calories, protein, carbs, fat, water, fiber
  - Heart rate zones (6 values)
  - Health scores (4 values)
  - Weight management (5 values)
  - Body composition (4 values)
  - Sleep analysis (3 values)
- [ ] Log shows: `✅ [DataBridge] advancedReview migrated successfully`

#### ✅ Cleanup
- [ ] Log shows: `✅ [DataBridge] Guest data cleared after successful migration`
- [ ] Final result shows: `{success: true, migratedKeys: [5 items], errors: []}`

---

## ✅ Post-Migration Verification

### Step 5: Verify in App
- [ ] App successfully loads after migration
- [ ] No error modals shown
- [ ] User profile shows complete data
- [ ] Dashboard displays:
  - [ ] Daily calorie goal (from advancedReview.daily_calories)
  - [ ] Macro breakdown (protein/carbs/fat)
  - [ ] Water intake goal (daily_water_ml)
  - [ ] BMI displayed correctly
  - [ ] Health score visible

### Step 6: Verify in Supabase Database

#### Check `profiles` table:
```sql
SELECT * FROM profiles WHERE id = '<userId>';
```
**Expected:**
- [ ] first_name: 'Harsh' (or your name)
- [ ] last_name: 'Sharma'
- [ ] age: 26
- [ ] gender: 'male'
- [ ] occupation_type: 'desk_job'
- [ ] wake_time: '06:00:00'
- [ ] sleep_time: '22:00:00'
- [ ] country, state, region populated

#### Check `diet_preferences` table:
```sql
SELECT * FROM diet_preferences WHERE user_id = '<userId>';
```
**Expected:**
- [ ] diet_type: 'vegetarian'
- [ ] allergies: [] (array)
- [ ] restrictions: [] (array)
- [ ] All 14 boolean health habit fields populated:
  - drinks_enough_water
  - limits_sugary_drinks
  - eats_regular_meals
  - avoids_late_night_eating
  - controls_portion_sizes
  - reads_nutrition_labels
  - eats_processed_foods
  - eats_5_servings_fruits_veggies
  - limits_refined_sugar
  - includes_healthy_fats
  - drinks_alcohol
  - smokes_tobacco
  - drinks_coffee
  - takes_supplements

#### Check `body_analysis` table:
```sql
SELECT * FROM body_analysis WHERE user_id = '<userId>';
```
**Expected (TRANSFORMED FORMAT):**
- [ ] height_cm: 172 (NOT in nested measurements!)
- [ ] current_weight_kg: 92 (NOT in nested measurements!)
- [ ] target_weight_kg: 75
- [ ] target_timeline_weeks: 12 (or your value)
- [ ] medical_conditions: [] (array)
- [ ] pregnancy_status: false
- [ ] breastfeeding_status: false

#### Check `workout_preferences` table:
```sql
SELECT * FROM workout_preferences WHERE user_id = '<userId>';
```
**Expected (TRANSFORMED FORMAT):**
- [ ] location: 'gym'
- [ ] equipment: [] (array)
- [ ] intensity: 'advanced' (from experience_level!)
- [ ] workout_types: ['strength', 'cardio', 'hiit', ...] (array)
- [ ] primary_goals: ['weight-loss', 'muscle-gain'] (array)
- [ ] workout_frequency_per_week: 7 (from workoutsPerWeek!)

#### Check `advanced_review` table:
```sql
SELECT * FROM advanced_review WHERE user_id = '<userId>';
```
**Expected (ALL 40+ CALCULATED FIELDS):**
- [ ] **Metabolic Calculations:**
  - calculated_bmi: ~31.1
  - calculated_bmr: ~1850
  - calculated_tdee: ~2280
  - metabolic_age: ~32

- [ ] **Daily Nutritional Needs:**
  - daily_calories: ~2280
  - daily_protein_g: ~138
  - daily_carbs_g: ~256
  - daily_fat_g: ~76
  - daily_water_ml: ~3200
  - daily_fiber_g: ~38

- [ ] **Weight Management:**
  - healthy_weight_min: ~58
  - healthy_weight_max: ~78
  - weekly_weight_loss_rate: ~0.5
  - estimated_timeline_weeks: ~34
  - total_calorie_deficit: ~500

- [ ] **Body Composition:**
  - ideal_body_fat_min: ~10
  - ideal_body_fat_max: ~20
  - lean_body_mass: ~70
  - fat_mass: ~22

- [ ] **Heart Rate Zones:**
  - target_hr_fat_burn_min: ~98
  - target_hr_fat_burn_max: ~118
  - target_hr_cardio_min: ~118
  - target_hr_cardio_max: ~138
  - target_hr_peak_min: ~138
  - target_hr_peak_max: ~158

- [ ] **Fitness Recommendations:**
  - estimated_vo2_max: ~42
  - recommended_workout_frequency: ~5
  - recommended_cardio_minutes: ~150
  - recommended_strength_sessions: ~3

- [ ] **Health Scores (0-100):**
  - overall_health_score: ~65
  - diet_readiness_score: ~45
  - fitness_readiness_score: ~75
  - goal_realistic_score: ~85

- [ ] **Sleep Analysis:**
  - recommended_sleep_hours: ~8
  - current_sleep_duration: ~6.5
  - sleep_efficiency_score: ~70

- [ ] **Data Quality Metrics:**
  - data_completeness_percentage: ~85
  - reliability_score: ~80
  - personalization_level: ~90

---

## ❌ Common Issues & Solutions

### Issue 1: Migration Fails with Errors
**Symptoms:**
```log
❌ [DataBridge] bodyAnalysis migration failed: ["Database save failed"]
⚠️ [DataBridge] Migration had errors, keeping guest data for retry
```

**Check:**
- [ ] Is user properly authenticated? (userId should be a UUID, not 'guest')
- [ ] Are transformations working? (Look for transformation logs)
- [ ] Is Supabase connection working?

**Solution:**
- Guest data is KEPT for retry
- User can try "Sync Data" again
- Check network connection

### Issue 2: Some Fields Missing After Migration
**Symptoms:**
- Database has rows but some fields are NULL

**Check:**
- [ ] Was the data present in guest mode? (Check AsyncStorage logs)
- [ ] Did transformation logs show the correct data?

**Solution:**
- Check transformation logic in DataBridge.ts
- Verify field name mapping (old → new)

### Issue 3: Advanced Review Data Missing
**Symptoms:**
```log
❌ Daily calories showing as 0
❌ Macros not displayed
```

**Most Common Cause:**
- Advanced Review was not calculated during onboarding
- User skipped Tab 5

**Solution:**
- Re-complete onboarding
- Ensure Tab 5 loads and calculates metrics
- Check logs for `daily_water_ml` in advancedReview

---

## 📊 Success Criteria

✅ **Migration is 100% successful if:**

1. **All 5 tables have data in Supabase**
   - profiles: ✅
   - diet_preferences: ✅
   - body_analysis: ✅
   - workout_preferences: ✅
   - advanced_review: ✅

2. **No migration errors in logs**
   - All 5 "migrated successfully" messages shown

3. **Transformations applied correctly**
   - bodyAnalysis: nested → flat structure
   - workoutPreferences: camelCase → snake_case

4. **All calculated metrics preserved**
   - 40+ fields in advanced_review table
   - BMI, BMR, TDEE, macros, water, fiber all present

5. **App functions normally after migration**
   - Dashboard loads
   - Metrics displayed
   - User can generate workouts/meals

---

## 🎯 Testing Quick Reference

**Run automated test:**
```bash
node scripts/test-migration-complete.js
```

**View Supabase data:**
```sql
-- Get all migrated data for a user
SELECT
  (SELECT COUNT(*) FROM profiles WHERE id = '<userId>') as profiles_count,
  (SELECT COUNT(*) FROM diet_preferences WHERE user_id = '<userId>') as diet_prefs_count,
  (SELECT COUNT(*) FROM body_analysis WHERE user_id = '<userId>') as body_analysis_count,
  (SELECT COUNT(*) FROM workout_preferences WHERE user_id = '<userId>') as workout_prefs_count,
  (SELECT COUNT(*) FROM advanced_review WHERE user_id = '<userId>') as advanced_review_count;
```

**Expected result:** All counts should be 1

---

**Last Updated:** January 2026
**Version:** 1.0.0
