# FitAI Data Architecture

> **Last updated:** 2026-04-03 (all tech debt items resolved)
> **Status:** All issues from Waves 1–10 resolved. Only acceptable low-priority items remain (calorie fallback).

## Table of Contents

- [A. Data Model & Variable Inventory](#a-data-model--variable-inventory)
- [B. Persistence & Sync Architecture](#b-persistence--sync-architecture)
- [C. Calculation Engine](#c-calculation-engine)
- [D. Naming Conventions & Type Mapping](#d-naming-conventions--type-mapping)
- [E. Main App Data Consumption](#e-main-app-data-consumption)
- [F. Generation Pipelines](#f-generation-pipelines)
- [G. Resolved Issues Log](#g-resolved-issues-log)
- [H. Remaining Technical Debt](#h-remaining-technical-debt)

---

## A. Data Model & Variable Inventory

### A.1 Core Type Interfaces

| Interface | File | DB Table | Tab | Purpose |
|-----------|------|----------|-----|---------|
| `PersonalInfoData` | `src/types/onboarding.ts` | `profiles` | 1 | Demographics, location, sleep |
| `DietPreferencesData` | `src/types/onboarding.ts` | `diet_preferences` | 2 | Diet type, readiness, meals, cooking, health habits |
| `BodyAnalysisData` | `src/types/onboarding.ts` | `body_analysis` | 3 | Measurements, photos, AI analysis, medical |
| `WorkoutPreferencesData` | `src/types/onboarding.ts` | `workout_preferences` | 4 | Goals, fitness level, exercise preferences |
| `AdvancedReviewData` | `src/types/onboarding.ts` + `src/types/onboarding/advanced-review.ts` | `advanced_review` | 5 | All calculated/derived metrics |
| `OnboardingProgressData` | `src/types/onboarding.ts` | `onboarding_progress` | — | Progress tracking |
| `ProfilesRow` | `src/types/onboarding.ts` | `profiles` | — | Nullable DB row for profiles |
| `DietPreferencesRow` | `src/types/onboarding.ts` | `diet_preferences` | — | Nullable DB row |
| `BodyAnalysisRow` | `src/types/onboarding.ts` | `body_analysis` | — | Nullable DB row |
| `WorkoutPreferencesRow` | `src/types/onboarding.ts` | `workout_preferences` | — | Nullable DB row |
| `AdvancedReviewRow` | `src/types/onboarding.ts` | `advanced_review` | — | Nullable DB row |
| `PersonalInfoFormState` | `src/types/onboarding.ts` | — | 1 | Extends data + UI fields |
| `DietPreferencesFormState` | `src/types/onboarding.ts` | — | 2 | Extends data + UI fields |
| `BodyAnalysisFormState` | `src/types/onboarding.ts` | — | 3 | Extends data + UI fields |
| `WorkoutPreferencesFormState` | `src/types/onboarding.ts` | — | 4 | Extends data + UI fields |
| `AdvancedReviewFormState` | `src/types/onboarding.ts` | — | 5 | Extends data + UI fields |
| `OnboardingReviewData` | `src/types/onboarding.ts` | — | — | ⚠️ Legacy camelCase wrapper for completion flow |
| `CalculatedMetrics` | `src/hooks/useCalculatedMetrics.ts` | — | — | camelCase post-onboarding metrics interface |
| `CompleteOnboardingData` | `src/types/onboarding.ts` | — | — | All 5 tabs combined |

### A.2 Tab 1: Personal Info → `profiles` table

| # | Field | snake_case Name | Type | Default | Validation | Storage |
|---|-------|----------------|------|---------|------------|---------|
| 1 | First Name | `first_name` | string | `""` | min 1, max 50 chars | `profiles.first_name` |
| 2 | Last Name | `last_name` | string | `""` | min 1, max 50 chars | `profiles.last_name` |
| 3 | Name (computed) | `name` | string | `"User"` | derived: first_name + last_name | `profiles.name` |
| 4 | Age | `age` | number | `0` | 13–120 | `profiles.age` |
| 5 | Gender | `gender` | enum | `"prefer_not_to_say"` | male/female/other/prefer_not_to_say | `profiles.gender` |
| 6 | Country | `country` | string | `""` | required | `profiles.country` |
| 7 | State | `state` | string | `""` | required | `profiles.state` |
| 8 | Region | `region` | string | `""` | optional | `profiles.region` |
| 9 | Wake Time | `wake_time` | string | `"07:00"` | HH:MM format | `profiles.wake_time` |
| 10 | Sleep Time | `sleep_time` | string | `"23:00"` | HH:MM format | `profiles.sleep_time` |
| 11 | ⚠️ Occupation Type | `occupation_type` | string | `"desk_job"` | DEPRECATED — still saved to DB | `profiles.occupation_type` |
| 12 | Email | `email` | string | `""` | auto-populated from auth | `profiles.email` |

**Derived (UI only, not persisted):**
- `calculateSleepDuration()` — computed from wake_time and sleep_time for display

### A.3 Tab 2: Diet Preferences → `diet_preferences` table

#### Core Diet
| # | Field | snake_case Name | Type | Default | Storage |
|---|-------|----------------|------|---------|---------|
| 1 | Diet Type | `diet_type` | enum | `"balanced"` | `diet_preferences.diet_type` |
| 2 | Allergies | `allergies` | string[] | `[]` | `diet_preferences.allergies` |
| 3 | Restrictions | `restrictions` | string[] | `[]` | `diet_preferences.restrictions` |
| 4 | Cuisine Preferences | `cuisine_preferences` | string[] | `[]` | `diet_preferences.cuisine_preferences` |
| 5 | Snacks Count | `snacks_count` | number | `2` | `diet_preferences.snacks_count` |

#### Diet Readiness Toggles
| # | Field | snake_case Name | Default | Storage |
|---|-------|----------------|---------|---------|
| 6 | Keto Ready | `keto_ready` | `false` | `diet_preferences.keto_ready` |
| 7 | IF Ready | `intermittent_fasting_ready` | `false` | `diet_preferences.intermittent_fasting_ready` |
| 8 | Paleo Ready | `paleo_ready` | `false` | `diet_preferences.paleo_ready` |
| 9 | Mediterranean Ready | `mediterranean_ready` | `false` | `diet_preferences.mediterranean_ready` |
| 10 | Low Carb Ready | `low_carb_ready` | `false` | `diet_preferences.low_carb_ready` |
| 11 | High Protein Ready | `high_protein_ready` | `false` | `diet_preferences.high_protein_ready` |

#### Meal Preferences
| # | Field | snake_case Name | Default | Storage |
|---|-------|----------------|---------|---------|
| 12 | Breakfast Enabled | `breakfast_enabled` | `true` | `diet_preferences.breakfast_enabled` |
| 13 | Lunch Enabled | `lunch_enabled` | `true` | `diet_preferences.lunch_enabled` |
| 14 | Dinner Enabled | `dinner_enabled` | `true` | `diet_preferences.dinner_enabled` |
| 15 | Snacks Enabled | `snacks_enabled` | `true` | `diet_preferences.snacks_enabled` |

#### Cooking Preferences
| # | Field | snake_case Name | Default | Storage |
|---|-------|----------------|---------|---------|
| 16 | Cooking Skill | `cooking_skill_level` | `"beginner"` | `diet_preferences.cooking_skill_level` |
| 17 | Max Prep Time (min) | `max_prep_time_minutes` | `30` | `diet_preferences.max_prep_time_minutes` |
| 18 | Budget Level | `budget_level` | `"medium"` | `diet_preferences.budget_level` |
| 19 | Cooking Methods | `cooking_methods` | `[]` | `diet_preferences.cooking_methods` (JSONB) |

#### Health Habits (14 booleans)
| # | Field | snake_case Name | Default | Storage |
|---|-------|----------------|---------|---------|
| 19 | Drinks Enough Water | `drinks_enough_water` | `false` | `diet_preferences.drinks_enough_water` |
| 20 | Limits Sugary Drinks | `limits_sugary_drinks` | `false` | `diet_preferences.limits_sugary_drinks` |
| 21 | Eats Regular Meals | `eats_regular_meals` | `false` | `diet_preferences.eats_regular_meals` |
| 22 | Avoids Late Night Eating | `avoids_late_night_eating` | `false` | `diet_preferences.avoids_late_night_eating` |
| 23 | Controls Portion Sizes | `controls_portion_sizes` | `false` | `diet_preferences.controls_portion_sizes` |
| 24 | Reads Nutrition Labels | `reads_nutrition_labels` | `false` | `diet_preferences.reads_nutrition_labels` |
| 25 | Eats Processed Foods | `eats_processed_foods` | `true` | `diet_preferences.eats_processed_foods` |
| 26 | Eats 5 Servings Fruits/Veggies | `eats_5_servings_fruits_veggies` | `false` | `diet_preferences.eats_5_servings_fruits_veggies` |
| 27 | Limits Refined Sugar | `limits_refined_sugar` | `false` | `diet_preferences.limits_refined_sugar` |
| 28 | Includes Healthy Fats | `includes_healthy_fats` | `false` | `diet_preferences.includes_healthy_fats` |
| 29 | Drinks Alcohol | `drinks_alcohol` | `false` | `diet_preferences.drinks_alcohol` |
| 30 | Smokes Tobacco | `smokes_tobacco` | `false` | `diet_preferences.smokes_tobacco` |
| 31 | Drinks Coffee | `drinks_coffee` | `false` | `diet_preferences.drinks_coffee` |
| 32 | Takes Supplements | `takes_supplements` | `false` | `diet_preferences.takes_supplements` |

### A.4 Tab 3: Body Analysis → `body_analysis` table

#### Core Measurements
| # | Field | snake_case Name | Type | Default | Validation | Storage |
|---|-------|----------------|------|---------|------------|---------|
| 1 | Height (cm) | `height_cm` | number | `0` | 100–250 | `body_analysis.height_cm` |
| 2 | Current Weight (kg) | `current_weight_kg` | number | `0` | 30–300 | `body_analysis.current_weight_kg` |
| 3 | Target Weight (kg) | `target_weight_kg` | number | `0` | 30–300 | `body_analysis.target_weight_kg` |
| 4 | Target Timeline (weeks) | `target_timeline_weeks` | number | `12` | 4–104 | `body_analysis.target_timeline_weeks` |

#### Body Composition (optional)
| # | Field | snake_case Name | Type | Storage |
|---|-------|----------------|------|---------|
| 5 | Body Fat % | `body_fat_percentage` | number? | `body_analysis.body_fat_percentage` |
| 6 | Waist (cm) | `waist_cm` | number? | `body_analysis.waist_cm` |
| 7 | Hip (cm) | `hip_cm` | number? | `body_analysis.hip_cm` |
| 8 | Chest (cm) | `chest_cm` | number? | `body_analysis.chest_cm` |

#### Photos
| # | Field | snake_case Name | Storage |
|---|-------|----------------|---------|
| 9 | Front Photo | `front_photo_url` | `body_analysis.front_photo_url` |
| 10 | Side Photo | `side_photo_url` | `body_analysis.side_photo_url` |
| 11 | Back Photo | `back_photo_url` | `body_analysis.back_photo_url` |

#### AI Analysis Results
| # | Field | snake_case Name | Type | Storage |
|---|-------|----------------|------|---------|
| 12 | AI Estimated Body Fat | `ai_estimated_body_fat` | number? | `body_analysis.ai_estimated_body_fat` |
| 13 | AI Body Type | `ai_body_type` | enum? | `body_analysis.ai_body_type` |
| 14 | AI Confidence Score | `ai_confidence_score` | number? | `body_analysis.ai_confidence_score` |

#### Medical Information
| # | Field | snake_case Name | Type | Storage |
|---|-------|----------------|------|---------|
| 15 | Medical Conditions | `medical_conditions` | string[] | `body_analysis.medical_conditions` |
| 16 | Medications | `medications` | string[] | `body_analysis.medications` |
| 17 | Physical Limitations | `physical_limitations` | string[] | `body_analysis.physical_limitations` |
| 18 | Pregnancy Status | `pregnancy_status` | boolean | `body_analysis.pregnancy_status` |
| 19 | Pregnancy Trimester | `pregnancy_trimester` | number? | `body_analysis.pregnancy_trimester` |
| 20 | Breastfeeding Status | `breastfeeding_status` | boolean | `body_analysis.breastfeeding_status` |
| 21 | Stress Level | `stress_level` | enum? | `body_analysis.stress_level` |

#### Auto-Calculated (in useBodyAnalysis hook)
| # | Field | snake_case Name | Formula | Storage |
|---|-------|----------------|---------|---------|
| 22 | BMI | `bmi` | weight / (height/100)² | `body_analysis.bmi` |
| 23 | BMR | `bmr` | Mifflin-St Jeor (see C.2) | `body_analysis.bmr` |
| 24 | Ideal Weight Min | `ideal_weight_min` | Devine formula ±10% | `body_analysis.ideal_weight_min` |
| 25 | Ideal Weight Max | `ideal_weight_max` | Devine formula ±10% | `body_analysis.ideal_weight_max` |
| 26 | Waist-Hip Ratio | `waist_hip_ratio` | waist_cm / hip_cm | `body_analysis.waist_hip_ratio` |

### A.5 Tab 4: Workout Preferences → `workout_preferences` table

#### Core Preferences
| # | Field | snake_case Name | Type | Default | Storage |
|---|-------|----------------|------|---------|---------|
| 1 | Location | `location` | enum | `"both"` | `workout_preferences.location` |
| 2 | Equipment | `equipment` | string[] | `[]` | `workout_preferences.equipment` |
| 3 | Time Preference (min) | `time_preference` | number | `30` | `workout_preferences.time_preference` |
| 4 | ⚠️ Session Duration | `session_duration_minutes` | number | — | Alias for `time_preference`, NOT in DB |
| 5 | Intensity | `intensity` | enum | `"beginner"` | `workout_preferences.intensity` |
| 6 | Workout Types | `workout_types` | string[] | `[]` | `workout_preferences.workout_types` |
| 7 | ⚠️ Available Equipment | `available_equipment` | string[] | — | Alias for `equipment`, NOT in DB |

#### Goals & Activity
| # | Field | snake_case Name | Type | Default | Storage |
|---|-------|----------------|------|---------|---------|
| 8 | Primary Goals | `primary_goals` | string[] | `[]` | `workout_preferences.primary_goals` |
| 9 | Activity Level | `activity_level` | enum | `"sedentary"` | `workout_preferences.activity_level` |

#### Fitness Assessment
| # | Field | snake_case Name | Type | Default | Storage |
|---|-------|----------------|------|---------|---------|
| 10 | Experience (years) | `workout_experience_years` | number | `0` | `workout_preferences.workout_experience_years` |
| 11 | Frequency (per week) | `workout_frequency_per_week` | number | `0` | `workout_preferences.workout_frequency_per_week` |
| 12 | Pushups Count | `can_do_pushups` | number | `0` | `workout_preferences.can_do_pushups` |
| 13 | Running Minutes | `can_run_minutes` | number | `0` | `workout_preferences.can_run_minutes` |
| 14 | Flexibility Level | `flexibility_level` | enum | `"fair"` | `workout_preferences.flexibility_level` |

#### Weight Goals
| # | Field | snake_case Name | Type | Storage |
|---|-------|----------------|------|---------|
| 15 | Weekly Loss Goal | `weekly_weight_loss_goal` | number? | `workout_preferences.weekly_weight_loss_goal` |

#### Enhanced Preferences
| # | Field | snake_case Name | Type | Default | Storage |
|---|-------|----------------|------|---------|---------|
| 16 | Preferred Workout Times | `preferred_workout_times` | string[] | `[]` | `workout_preferences.preferred_workout_times` |
| 17 | Enjoys Cardio | `enjoys_cardio` | boolean | `true` | `workout_preferences.enjoys_cardio` |
| 18 | Enjoys Strength | `enjoys_strength_training` | boolean | `true` | `workout_preferences.enjoys_strength_training` |
| 19 | Enjoys Group Classes | `enjoys_group_classes` | boolean | `false` | `workout_preferences.enjoys_group_classes` |
| 20 | Prefers Outdoor | `prefers_outdoor_activities` | boolean | `false` | `workout_preferences.prefers_outdoor_activities` |
| 21 | Needs Motivation | `needs_motivation` | boolean | `false` | `workout_preferences.needs_motivation` |
| 22 | Prefers Variety | `prefers_variety` | boolean | `true` | `workout_preferences.prefers_variety` |

### A.6 Tab 5: Advanced Review → `advanced_review` table

All fields are **calculated/derived** — no raw user inputs (except rate selection via wizard).

#### Metabolic Calculations
| # | Field | snake_case Name | Formula Summary | Upstream Inputs | Storage |
|---|-------|----------------|-----------------|-----------------|---------|
| 1 | BMI | `calculated_bmi` | weight / (height/100)² | current_weight_kg, height_cm | `advanced_review.calculated_bmi` |
| 2 | BMR | `calculated_bmr` | Mifflin-St Jeor (see C.2) | current_weight_kg, height_cm, age, gender | `advanced_review.calculated_bmr` |
| 3 | TDEE | `calculated_tdee` | BMR × occupation + exercise burn + age mod (see C.3) | BMR, activity_level, workout params, age, gender | `advanced_review.calculated_tdee` |
| 4 | Metabolic Age | `metabolic_age` | chronological + (expectedBMR − actualBMR)/expectedBMR × 50 | BMR, age, gender | `advanced_review.metabolic_age` |

#### Daily Nutritional Needs
| # | Field | snake_case Name | Formula Summary | Storage |
|---|-------|----------------|-----------------|---------|
| 5 | Daily Calories | `daily_calories` | TDEE ± deficit/surplus (see C.4) | `advanced_review.daily_calories` |
| 6 | Daily Protein (g) | `daily_protein_g` | referenceWeight × goalMultiplier × dietMultiplier | `advanced_review.daily_protein_g` |
| 7 | Daily Carbs (g) | `daily_carbs_g` | remaining cals after protein+fat, diet-type split | `advanced_review.daily_carbs_g` |
| 8 | Daily Fat (g) | `daily_fat_g` | calorie % allocation by diet type | `advanced_review.daily_fat_g` |
| 9 | Daily Water (ml) | `daily_water_ml` | weight×35 + activity bonus + climate adjustment | `advanced_review.daily_water_ml` |
| 10 | Daily Fiber (g) | `daily_fiber_g` | (dailyCalories/1000) × 14 | `advanced_review.daily_fiber_g` |

#### Weight Management
| # | Field | snake_case Name | Formula Summary | Storage |
|---|-------|----------------|-----------------|---------|
| 11 | Healthy Weight Min | `healthy_weight_min` | BMI-based range (BMI 18.5) | `advanced_review.healthy_weight_min` |
| 12 | Healthy Weight Max | `healthy_weight_max` | BMI-based range (BMI 25) | `advanced_review.healthy_weight_max` |
| 13 | Weekly Loss Rate | `weekly_weight_loss_rate` | weight × rate factor, clamped [0.3, 1.0] kg/week | `advanced_review.weekly_weight_loss_rate` |
| 14 | Estimated Timeline | `estimated_timeline_weeks` | weight diff / weekly rate | `advanced_review.estimated_timeline_weeks` |
| 15 | Total Calorie Deficit | `total_calorie_deficit` | dailyDeficit × timeline × 7 | `advanced_review.total_calorie_deficit` |

#### Body Composition
| # | Field | snake_case Name | Formula Summary | Storage |
|---|-------|----------------|-----------------|---------|
| 16 | Ideal Body Fat Min | `ideal_body_fat_min` | age/gender lookup table | `advanced_review.ideal_body_fat_min` |
| 17 | Ideal Body Fat Max | `ideal_body_fat_max` | age/gender lookup table | `advanced_review.ideal_body_fat_max` |
| 18 | Lean Body Mass | `lean_body_mass` | weight × (1 − body_fat%/100) | `advanced_review.lean_body_mass` |
| 19 | Fat Mass | `fat_mass` | weight × body_fat%/100 | `advanced_review.fat_mass` |

#### Fitness Metrics
| # | Field | snake_case Name | Formula Summary | Storage |
|---|-------|----------------|-----------------|---------|
| 20 | VO2 Max | `estimated_vo2_max` | peakVO2 − ageAdjust + runBonus | `advanced_review.estimated_vo2_max` |
| 21 | VO2 Max Class | `vo2_max_classification` | Excellent/Good/Average/Below based on gender | `advanced_review.vo2_max_classification` |
| 22 | Max Heart Rate | `max_heart_rate` | 208 − 0.7 × age (Tanaka) | UI-only, not persisted |
| 23 | HR Fat Burn Min | `target_hr_fat_burn_min` | maxHR × 0.60 | `advanced_review.target_hr_fat_burn_min` |
| 24 | HR Fat Burn Max | `target_hr_fat_burn_max` | maxHR × 0.70 | `advanced_review.target_hr_fat_burn_max` |
| 25 | HR Cardio Min | `target_hr_cardio_min` | maxHR × 0.70 | `advanced_review.target_hr_cardio_min` |
| 26 | HR Cardio Max | `target_hr_cardio_max` | maxHR × 0.85 | `advanced_review.target_hr_cardio_max` |
| 27 | HR Peak Min | `target_hr_peak_min` | maxHR × 0.85 | `advanced_review.target_hr_peak_min` |
| 28 | HR Peak Max | `target_hr_peak_max` | maxHR × 0.95 | `advanced_review.target_hr_peak_max` |
| 29 | Recommended Frequency | `recommended_workout_frequency` | base 3, adjusted by goals/experience | `advanced_review.recommended_workout_frequency` |
| 30 | Recommended Cardio (min/wk) | `recommended_cardio_minutes` | base 150, 250 for weight-loss, 300 for endurance | `advanced_review.recommended_cardio_minutes` |
| 31 | Recommended Strength | `recommended_strength_sessions` | base 2, 4 for muscle-gain | `advanced_review.recommended_strength_sessions` |

#### Health Scores (0–100)
| # | Field | snake_case Name | Formula Summary | Storage |
|---|-------|----------------|-----------------|---------|
| 32 | Overall Health Score | `overall_health_score` | composite: BMI, activity, habits, sleep, experience | `advanced_review.overall_health_score` |
| 33 | Diet Readiness | `diet_readiness_score` | 14 health habit booleans normalized | `advanced_review.diet_readiness_score` |
| 34 | Fitness Readiness | `fitness_readiness_score` | experience, pushups, running, activity, medical | `advanced_review.fitness_readiness_score` |
| 35 | Goal Realistic | `goal_realistic_score` | rate aggressiveness, goal/experience match | `advanced_review.goal_realistic_score` |

#### Sleep Analysis
| # | Field | snake_case Name | Formula Summary | Storage |
|---|-------|----------------|-----------------|---------|
| 36 | Recommended Sleep Hours | `recommended_sleep_hours` | age-based: <18→8.5, 18-25→8, 26-64→7.5, 65+→7 | `advanced_review.recommended_sleep_hours` |
| 37 | Current Sleep Duration | `current_sleep_duration` | (wakeMinutes − sleepMinutes + 1440) % 1440 / 60 | `advanced_review.current_sleep_duration` |
| 38 | Sleep Efficiency Score | `sleep_efficiency_score` | actual/recommended ratio + habit bonuses | `advanced_review.sleep_efficiency_score` |

#### Completion & Validation
| # | Field | snake_case Name | Storage |
|---|-------|----------------|---------|
| 39 | Data Completeness % | `data_completeness_percentage` | `advanced_review.data_completeness_percentage` |
| 40 | Reliability Score | `reliability_score` | `advanced_review.reliability_score` |
| 41 | Personalization Level | `personalization_level` | `advanced_review.personalization_level` |
| 42 | Validation Status | `validation_status` | `advanced_review.validation_status` |
| 43 | Validation Errors | `validation_errors` | `advanced_review.validation_errors` |
| 44 | Validation Warnings | `validation_warnings` | `advanced_review.validation_warnings` |

#### Context & Flags
| # | Field | snake_case Name | Storage | Notes |
|---|-------|----------------|---------|-------|
| 45 | BMI Category | `bmi_category` | `advanced_review.bmi_category` | Column added in Wave 1 migration |
| 46 | BMI Health Risk | `bmi_health_risk` | `advanced_review.bmi_health_risk` | Now computed in Wave 2B |
| 47 | BMR Formula Used | `bmr_formula_used` | `advanced_review.bmr_formula_used` | Set to "mifflin_st_jeor" (Wave 2B) |
| 48 | Detected Climate | `detected_climate` | `advanced_review.detected_climate` | From country/state auto-detection |
| 49 | Detected Ethnicity | `detected_ethnicity` | `advanced_review.detected_ethnicity` | 📋 Not yet computed — no consumers |
| 50 | Health Grade | `health_grade` | `advanced_review.health_grade` | Column added in Wave 1 migration |
| 51 | Was Rate Capped | `was_rate_capped` | `advanced_review.was_rate_capped` | Safety cap indicator |
| 52 | Refeed Schedule | `refeed_schedule` | `advanced_review.refeed_schedule` | JSON schedule |
| 53 | Medical Adjustments | `medical_adjustments` | `advanced_review.medical_adjustments` | From medical conditions |

#### ⚠️ Deprecated/Duplicate Fields
| Field | Issue | Status |
|-------|-------|--------|
| `health_score` | Duplicate of `overall_health_score` | `@deprecated` — dead write removed in Wave 2B |
| `vo2_max_estimate` | Duplicate of `estimated_vo2_max` | UI-only, not persisted |
| `heart_rate_zones` (JSONB) | Duplicate of individual HR fields | UI-only, not persisted |
| `usedFallbackDefaults` | camelCase flag | UI-only, not persisted |

### A.7 Supabase Tables

| Table | Primary Key | Foreign Key | Purpose |
|-------|------------|-------------|---------|
| `profiles` | `id` (auth UID) | — | Personal info, settings |
| `diet_preferences` | `id` | `user_id → profiles` | All diet preferences + health habits |
| `body_analysis` | `id` | `user_id → profiles` | Measurements, photos, medical |
| `workout_preferences` | `id` | `user_id → profiles` | Workout goals, assessment, preferences |
| `advanced_review` | `id` | `user_id → profiles` | All calculated metrics |
| `onboarding_progress` | `id` | `user_id → profiles` | Tab completion tracking |
| `workout_sessions` | `id` | `user_id → profiles` | Completed workout sessions |
| `exercise_sets` | `id` | `session_id → workout_sessions` | Per-set tracking data |
| `workout_templates` | `id` | `user_id → profiles` | Custom workout templates |
| `exercise_prs` | `id` | `user_id → profiles` | Personal records |
| `weekly_workout_plans` | `id` | `user_id → profiles` | AI/custom weekly plans |
| ⚠️ `fitness_goals` | `id` | `user_id → profiles` | DEPRECATED — fully migrated to `workout_preferences` (Wave 10). No runtime reads/writes. |

### A.8 Zustand Stores

**profileStore** (`src/stores/profileStore.ts`) — AsyncStorage key: `profile-storage-v2`

```
profileStore = {
  personalInfo: PersonalInfoData,       // Tab 1 data
  dietPreferences: DietPreferencesData, // Tab 2 data
  bodyAnalysis: BodyAnalysisData,       // Tab 3 data
  workoutPreferences: WorkoutPreferencesData, // Tab 4 data
  advancedReview: AdvancedReviewData,   // Tab 5 calculated data
  
  // Actions
  updatePersonalInfo(data),
  updateDietPreferences(data),
  updateBodyAnalysis(data),
  updateWorkoutPreferences(data),
  updateAdvancedReview(data),
}
```

**Other stores with onboarding-related data:**
- `userStore` — ⚠️ Legacy. Holds `UserProfile` for auth ops. Not SSOT for onboarding data.
- `fitnessStore` — Workout sessions, active plans, progress. NOT onboarding data.
- `nutritionStore` — Meal logs, nutrition tracking. NOT onboarding data.
- `hydrationStore` — Water tracking. Goal synced from `useCalculatedMetrics.dailyWaterML`.

---

## B. Persistence & Sync Architecture

### B.1 Storage Layers

```
┌─────────────────────────────────────────────────────┐
│  UI Components (React Native)                       │
│    ↕ Zustand selectors (reactive)                   │
├─────────────────────────────────────────────────────┤
│  profileStore (Zustand) ← RUNTIME SSOT              │
│    Auto-persisted to AsyncStorage "profile-storage-v2"│
│    via createDebouncedStorage()                      │
├─────────────────────────────────────────────────────┤
│  AsyncStorage                                        │
│    "profile-storage-v2" — Zustand auto-persist       │
│    "onboarding_data" — Guest/fallback data           │
│    "sync-engine-queue" — Offline operation queue     │
├─────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL) ← PERSISTENCE LAYER           │
│    profiles, diet_preferences, body_analysis,        │
│    workout_preferences, advanced_review,             │
│    onboarding_progress                               │
└─────────────────────────────────────────────────────┘
```

### B.2 Save Path (Onboarding)

```
UI (OnboardingContainer)
  → DataBridge.savePersonalInfo(data) [or save* for each tab]
    → profileStore.updatePersonalInfo(data)     [Zustand → AsyncStorage "profile-storage-v2"]
    → PersonalInfoService.save(userId, data)    [Supabase upsert → profiles table]
    → (if offline) SyncEngine.queueOperation()  [AsyncStorage "sync-engine-queue"]
    → (if guest) saveToLocal("personalInfo")    [AsyncStorage "onboarding_data"]
```

Each of the 5 tabs follows the same pattern:
- `PersonalInfoService` → `profiles`
- `DietPreferencesService` → `diet_preferences`
- `BodyAnalysisService` → `body_analysis`
- `WorkoutPreferencesService` → `workout_preferences`
- `AdvancedReviewService` → `advanced_review`

All services are in `src/services/onboardingService.ts`.

### B.3 Load Path (App Start)

```
DataBridge.initialize()
  → profileStore.getState()                   [Check Zustand first — hydrated from AsyncStorage]
  → AsyncStorage.getItem("onboarding_data")   [Fallback to raw AsyncStorage for guest data]
  → populateProfileStore()                    [Write to profileStore if data found]

DataBridge.loadAllData(userId)
  → if (userId) loadFromDatabase(userId)
    → PersonalInfoService.load(userId)        [Supabase SELECT from profiles]
    → DietPreferencesService.load(userId)     [Supabase SELECT from diet_preferences]
    → BodyAnalysisService.load(userId)        [etc.]
    → WorkoutPreferencesService.load(userId)
    → AdvancedReviewService.load(userId)
    → profileStore.updateXxx(result)          [Update Zustand SSOT for each section]
  → else loadFromLocal()                      [Guest: AsyncStorage only]
```

### B.4 Guest → User Migration

```
DataBridge.migrateGuestToUser(userId)
  → loadFromLocal()                           [Read guest data from Zustand/AsyncStorage]
  → For each section:
    → save*(data, userId)                     [Write to Zustand + Supabase]
  → If all remote syncs succeeded:
    → AsyncStorage.removeItem("onboarding_data")  [Clear guest data]
```

### B.5 Offline Queue (SyncEngine)

- Failed Supabase writes are queued to AsyncStorage key `sync-engine-queue`
- On next app start or network recovery, queued operations are retried
- Queue is processed FIFO
- Failed retries are kept in queue for next attempt

### B.6 Key Persistence Rules

1. **profileStore is always written first** — UI sees changes immediately
2. **Supabase writes are fire-and-forget with retry** — if they fail, SyncEngine queues them
3. **Load order**: Zustand hydration (instant) → Supabase fetch (async, updates store)
4. **Field names match across layers** — all snake_case in store, service, and DB
5. **Every save method uses `IF NOT EXISTS`-safe upsert** — safe to retry

---

## C. Calculation Engine

### C.1 Architecture Overview

Two calculation engines exist. `useReviewValidation` orchestrates both and resolves conflicts:

```
useReviewValidation (orchestrator)
  ├── ValidationEngine (SSOT for metabolic fields)
  │     → BMR, TDEE, daily calories, macros, weight management
  │     File: src/services/validation/core.ts
  │
  └── HealthCalculationEngine / master-engine (non-metabolic fields)
        → Health scores, HR zones, VO2 max, sleep, recommendations,
        │  bmi_category, bmi_health_risk, bmr_formula_used, vo2_max_classification
        File: src/utils/healthCalculations/master-engine.ts

useReviewValidation STRIPS metabolic fields from master-engine output
and uses ONLY ValidationEngine values for BMR/TDEE/calories/macros.
Non-metabolic fields come from master-engine.
```

**Post-onboarding consumption:**
```
useCalculatedMetrics (reads from profileStore — refactored in Wave 3A)
  → Subscribes to profileStore.advancedReview, bodyAnalysis, personalInfo, etc.
  → Transforms via mapToCalculatedMetrics() to CalculatedMetrics shape
  → Runtime water recalculation (intentional — fixes stale DB values)
  → No Supabase calls, no cache — reactive via Zustand subscriptions
```

### C.2 BMR (Basal Metabolic Rate)

**Formula:** Mifflin-St Jeor (1990) — `bmr_formula_used: "mifflin_st_jeor"`

```
Male:   10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
Female: 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
Other:  10 × weight(kg) + 6.25 × height(cm) − 5 × age − 78  (average)
```

| Input | Source | Validation |
|-------|--------|------------|
| `current_weight_kg` | bodyAnalysis | 30–300 kg |
| `height_cm` | bodyAnalysis | 100–250 cm |
| `age` | personalInfo | 13–120 |
| `gender` | personalInfo | male/female/other/prefer_not_to_say |

**Code path:** `MetabolicCalculations.calculateBMR()` → `core/bmrCalculation.calculateBMR()`
**Result:** `Math.round()` to integer

### C.3 TDEE (Total Daily Energy Expenditure)

**SSOT Formula (ValidationEngine):**

```
BaseTDEE = BMR × OccupationMultiplier
ExerciseBurn = MET × weight × hours × frequency / 7  (daily average)
AgeModifiedTDEE = (BaseTDEE + ExerciseBurn) × AgeModifier
FinalTDEE = AgeModifiedTDEE × MedicalAdjustment (if applicable)
```

**Occupation Multipliers:**
| Level | Multiplier |
|-------|-----------|
| sedentary | 1.25 |
| light | 1.35 |
| moderate | 1.45 |
| active | 1.60 |
| extreme/very_active | 1.70 |

**Age Modifiers:**
| Age Range | Modifier |
|-----------|----------|
| < 40 | 1.00 |
| 40–49 | 0.95 |
| 50–59 | 0.90 |
| 60+ | 0.85 |
| Female 45–55 | additional × 0.95 |

**MET values** used for exercise burn depend on workout type, intensity, and frequency.

**Note:** Master-engine uses a simpler formula (`BMR × ActivityMultiplier` with standard multipliers 1.2/1.375/1.55/1.725/1.9) but its TDEE values are STRIPPED by useReviewValidation.

### C.4 Daily Calories

```
Weight Loss: TDEE − (weeklyRate × 7700 / 7), floor at BMR
Weight Gain: TDEE + min(dailySurplus, TDEE × 0.15)
Maintenance: TDEE
```

**Medical adjustments** preserve the deficit ratio: `targetCalories × (adjustedTDEE / tdee)`
**Minimum floor:** BMR (bypass mode) — no hardcoded 1200 floor in SSOT path

### C.5 Macronutrients

**Protein:**
```
protein_g = referenceWeight × goalMultiplier × dietMultiplier
```

| Goal | Multiplier |
|------|-----------|
| fat_loss | 2.2 |
| muscle_gain | 1.8 |
| maintenance | 1.6 |
| athletic | 2.2 |
| endurance | 1.6 |
| strength | 2.2 |

| Diet Type | Multiplier |
|-----------|-----------|
| omnivore/pescatarian/keto/low_carb/paleo/mediterranean | 1.0 |
| vegetarian | 1.15 |
| vegan | 1.25 |

**Reference weight priority:** (1) lean body mass if body fat known, (2) min(current, target) if overweight, (3) current weight

**Fat/Carbs — diet-type splits from remaining calories after protein:**

| Diet Type | Fat % of remaining | Carbs % of remaining |
|-----------|-------------------|---------------------|
| Keto | 70% of total cal | 5% of total cal |
| Low Carb | 45% | remainder |
| Paleo/Mediterranean | 35% | remainder |
| Balanced/Omnivore | 30% | 70% |

**Medical:** Insulin resistance (PCOS/diabetes): carbs × 0.75, difference shifted to fat

### C.6 Water Intake

**SSOT:** `ClimateAdaptiveWaterCalculator` singleton (`waterCalculator`)

```
base = weight × 35 ml  (EFSA recommendation)
+ activityBonus
+ climateAdjustment
→ round to nearest 50 ml
```

| Activity Level | Bonus (ml) |
|---------------|-----------|
| sedentary | +0 |
| light | +500 |
| moderate | +1000 |
| active | +1500 |
| very_active/extreme | +2000 |

| Climate | Adjustment (ml) |
|---------|----------------|
| tropical | +700 |
| temperate | +0 |
| cold | −200 |
| arid | +1000 |

**Runtime recalculation:** `useCalculatedMetrics.mapToCalculatedMetrics()` re-runs `waterCalculator.calculate()` at read time. This is intentional — corrects stale DB values from the old multiplicative formula.

### C.7 Heart Rate Zones

**Max HR:** Tanaka (2001): `208 − 0.7 × age`

| Zone | Min % of MaxHR | Max % of MaxHR |
|------|---------------|---------------|
| Fat Burn | 60% | 70% |
| Cardio | 70% | 85% |
| Peak | 85% | 95% |

**Note:** Uses %MaxHR, NOT Karvonen (no resting HR collected in onboarding).

### C.8 Health Scores

**Overall Health Score (0–100):** Starts at 100, adjusted by:
- BMI deviation from normal range
- Activity level (sedentary penalized, active rewarded)
- Diet habits (14 boolean health habits)
- Sleep efficiency
- Workout experience and frequency

**Diet Readiness Score:** Sum of 14 boolean habit multipliers, normalized to 0–100 via `((score+45)/200) × 100`

**Fitness Readiness Score:** Starts at 50, adds:
- experience × 3 (cap 15)
- pushups × 0.5 (cap 15)
- running × 0.3 (cap 15)
- activity bonus
- subtracts medical/limitation penalties

**Goal Realistic Score:** Starts at 80, adjusts for:
- Weekly rate aggressiveness
- Goal/experience mismatch
- Medical condition impact

### C.9 Other Metrics

**VO2 Max:** `peakVO2 − ageAdjustment + runningBonus`, clamped [20, 80]
- peakVO2: male=50, female=40
- ageAdjustment: `(age − 20) × 0.5` (male) or `× 0.4` (female)
- runningBonus: `min(canRunMinutes, 60) × 0.3`

**Metabolic Age:** `chronologicalAge + (expectedBMR − actualBMR)/expectedBMR × 50`, clamped [18, 85]

**Sleep:** recommended hours by age group, duration from wake/sleep times, efficiency ratio

---

## D. Naming Conventions & Type Mapping

### D.1 Convention Rules

| Layer | Convention | Examples |
|-------|-----------|---------|
| Supabase tables/columns | snake_case | `current_weight_kg`, `diet_type`, `activity_level` |
| profileStore | snake_case | `profileStore.bodyAnalysis.current_weight_kg` |
| Onboarding types | snake_case | `PersonalInfoData.first_name` |
| useCalculatedMetrics return | camelCase | `calculatedMetrics.dailyCalories`, `currentWeightKg` |
| Workers API | camelCase | `profile.fitnessGoal`, `profile.experienceLevel` |
| Legacy user.ts types | camelCase | `PersonalInfo.activityLevel`, `FitnessGoals.primaryGoals` |
| AI schemas | camelCase | `workoutSchema.experienceLevel` |

**Rule:** snake_case is canonical (stores + DB). camelCase exists at boundaries (Workers API, AI, legacy). Mapping happens in `typeTransformers.ts` and `aiRequestTransformers.ts`.

### D.2 Enum Mappings (Fixed in Wave 2A)

**Activity Level:**
| Onboarding Value | Health Calc Value | Mapping Function |
|-----------------|-------------------|-----------------|
| `"sedentary"` | `"sedentary"` | pass-through |
| `"light"` | `"light"` | pass-through |
| `"moderate"` | `"moderate"` | pass-through |
| `"active"` | `"active"` | pass-through |
| `"extreme"` | `"very_active"` | `mapActivityLevelForHealthCalc()` |

**Diet Type:**
| Onboarding Value | Health Calc Value | Mapping Function |
|-----------------|-------------------|-----------------|
| `"vegetarian"` | `"vegetarian"` | pass-through |
| `"vegan"` | `"vegan"` | pass-through |
| `"pescatarian"` | `"pescatarian"` | pass-through |
| `"non-veg"` | `"omnivore"` | `mapDietTypeForHealthCalc()` |
| `"balanced"` | `"omnivore"` | `mapDietTypeForHealthCalc()` |

**Defense-in-depth:** All calculator lookup maps also accept `"extreme"` as a direct key (aliased to same value as `"very_active"`), preventing silent fallback errors.

Functions in `src/utils/typeTransformers.ts`:
- `mapActivityLevelForHealthCalc(onboardingLevel)` → health calc value
- `mapActivityLevelForOnboarding(healthCalcLevel)` → onboarding value
- `mapDietTypeForHealthCalc(onboardingDietType)` → health calc value
- `mapDietTypeForOnboarding(healthCalcDietType)` → onboarding value

### D.3 Boundary Mapping Functions

All in `src/utils/typeTransformers.ts`:

| Function | Purpose |
|----------|---------|
| `toAppFormat(data)` | Generic snake_case → camelCase conversion |
| `toDbFormat(data)` | Generic camelCase → snake_case conversion |
| `normalizeToSnakeCase(data)` | Normalize mixed-case objects to snake_case |
| `normalizeToCamelCase(data)` | Normalize mixed-case objects to camelCase |
| `mapActivityLevelForHealthCalc()` | Onboarding → health calc activity level |
| `mapDietTypeForHealthCalc()` | Onboarding → health calc diet type |
| `FIELD_MAPPINGS` | Static mapping table of snake↔camel pairs |

**Note:** Key-doubling in `toAppFormat()` was removed in Wave 3B. Objects no longer contain both conventions simultaneously.

### D.4 Legacy Interfaces

| Interface | File | Status | Use Instead |
|-----------|------|--------|-------------|
| `PersonalInfo` | `src/types/user.ts` | ⚠️ Legacy | `PersonalInfoData` |
| `BodyMetrics` | `src/types/user.ts` | ⚠️ Legacy | `BodyAnalysisData` |
| `DietPreferences` | `src/types/user.ts` | ⚠️ Legacy | `DietPreferencesData` |
| `WorkoutPreferences` | `src/types/user.ts` | ⚠️ Legacy (has 6+ backward-compat aliases) | `WorkoutPreferencesData` |
| `FitnessGoals` | `src/types/user.ts` | ⚠️ Legacy (overlaps workout_preferences) | `WorkoutPreferencesData` |
| `UserProfile` | `src/types/user.ts` | ⚠️ Legacy | `profileStore` direct access |
| `UserProfile` | `src/types/profileData.ts` | ⚠️ Legacy (SyncableData) | `profileStore` |
| `UserProfile` | `src/utils/healthCalculations/types.ts` | ⚠️ Legacy (flat, different shape) | `profileStore` |
| `OnboardingReviewData` | `src/types/onboarding.ts` | ⚠️ Legacy (camelCase wrapper) | `CompleteOnboardingData` |
| `OnboardingReviewData` | `src/types/onboarding/legacy.ts` | Re-export from canonical (Wave 3B) | Same |
| `OnboardingData` | `src/types/user.ts` | ⚠️ Legacy (camelCase, partial) | `CompleteOnboardingData` |
| `OnboardingData` | `src/types/localData.ts` | ⚠️ Legacy (only 2 tabs) | `CompleteOnboardingData` |
| `BodyAnalysis` | `src/types/profileData.ts` | ⚠️ Legacy (different shape, nested measurements) | `BodyAnalysisData` |
| `NutritionPreferences` | `src/types/diet.ts` | ⚠️ Legacy (different field names) | `DietPreferencesData` |

### D.5 Adapter Layers

| Adapter | File | Purpose |
|---------|------|---------|
| `typeTransformers.ts` | `src/utils/typeTransformers.ts` | Generic snake↔camel + enum mapping |
| `transformBodyAnalysisForDB` | `src/services/data-bridge/bodyAnalysis.ts` | Old nested format → flat snake_case |
| `transformWorkoutPreferencesForDB` | `src/services/data-bridge/workoutPreferences.ts` | Legacy camelCase → snake_case |
| `workersDataTransformers.ts` | `src/services/workersDataTransformers.ts` | `primaryGoals[0]` → singular `fitnessGoal` for Workers |
| `aiRequestTransformers.ts` | `src/services/aiRequestTransformers.ts` | Builds Workers API payloads for diet + workout generation |
| `profileLegacyAdapter.ts` | `src/utils/profileLegacyAdapter.ts` | profileStore → legacy UserProfile shape |
| `useOnboardingLogic.ts` | `src/hooks/useOnboardingLogic.ts` | Constructs OnboardingReviewData at completion |

---

## E. Main App Data Consumption

### E.1 Source of Truth Rule

```
profileStore (Zustand) = SSOT for all user/onboarding data at runtime
  ↑ read by all screens/hooks via selectors
  
useCalculatedMetrics = derived view of profileStore data
  ↑ transforms profileStore.advancedReview → CalculatedMetrics (camelCase)
  ↑ reads from profileStore (NOT Supabase — refactored in Wave 3A)
  ↑ reactive via Zustand subscriptions (no 5-min cache)
```

**Rule:** Every screen reads from `profileStore` or `useCalculatedMetrics`. No screen should fetch directly from Supabase for onboarding data.

### E.2 Home Screen

**Hook:** `useHomeLogic` (`src/hooks/useHomeLogic.ts`)

| Data | Source | Path |
|------|--------|------|
| User name | `profileStore.personalInfo.first_name + last_name` | Direct selector |
| Weight data | `profileStore.bodyAnalysis.current_weight_kg` via `resolveCurrentWeight()` | Centralized resolver |
| Goal weight | `profileStore.bodyAnalysis.target_weight_kg` | Direct selector |
| Calorie goal | `useCalculatedMetrics().dailyCalories` | Calculated metrics |
| Active calorie goal | `useCalculatedMetrics().calculatedTDEE - calculatedBMR` | Derived |
| Water goal | `useCalculatedMetrics().dailyWaterML` → hydrationStore | Set on mount |
| Workout goal | Scheduled workout duration or `workoutPreferences.time_preference` | Priority chain |
| Weight unit | `profileStore.personalInfo.units` | Direct selector |

### E.3 Diet Screen

**Hooks:** `useMealPlanning`, `useNutritionTracking`, `useAIMealGeneration`

| Data | Source | Path |
|------|--------|------|
| All profile sections | `profileStore.*` | useMealPlanning reads all 5 sections |
| Calorie target | `useCalculatedMetrics().dailyCalories` | Passed to AI generation |
| Macro targets | `useCalculatedMetrics().dailyProteinG/CarbsG/FatG` | Nutrition tracking display |
| Water goal | `useCalculatedMetrics().dailyWaterML` | Set via hydrationStore (useNutritionTracking) |
| Diet preferences | `profileStore.dietPreferences` | Passed to AI generation |
| Meal plan generation | `aiService.generateWeeklyMealPlanAsync()` | Full profile data sent |

### E.4 Workout Screen

**Hook:** `useFitnessLogic` (`src/hooks/useFitnessLogic.ts`)

| Data | Source | Path |
|------|--------|------|
| Personal info | `profileStore.personalInfo` | Age, gender for AI prompt |
| Body analysis | `profileStore.bodyAnalysis` | Weight, medical conditions |
| Workout prefs | `profileStore.workoutPreferences` | All preferences + assessment |
| Advanced review | `profileStore.advancedReview` | Recommendations, HR zones (wired in Wave 2E) |
| Workout generation | `aiService.generateWeeklyWorkoutPlan()` | All data passed including advancedReview |

### E.5 Profile Screen

| Flow | Description |
|------|-------------|
| **Display** | Reads from `profileStore` for all profile sections |
| **Edit** | Writes to `profileStore` → syncs to Supabase |
| **Pull-to-refresh** | Fetches from Supabase → updates `profileStore` |
| **Completeness check** | `userStore.checkProfileComplete()` reads `workoutPreferences` first (Wave 3A) |

### E.6 Progress / Analytics

| Data | Source |
|------|--------|
| Weight unit | `profileStore.personalInfo.units` |
| Current/target weight | `useCalculatedMetrics().currentWeightKg/targetWeightKg` |
| BMI, health scores | `useCalculatedMetrics()` |
| HR zones | `useCalculatedMetrics().heartRateZones` |

### E.7 Key Consumer Hooks

| Hook | File | Reads From |
|------|------|-----------|
| `useHomeLogic` | `src/hooks/useHomeLogic.ts` | profileStore, useCalculatedMetrics, hydrationStore |
| `useFitnessLogic` | `src/hooks/useFitnessLogic.ts` | profileStore (all 4 sections + advancedReview) |
| `useMealPlanning` | `src/hooks/useMealPlanning.ts` | profileStore (all 5 sections), useCalculatedMetrics |
| `useNutritionTracking` | `src/hooks/useNutritionTracking.ts` | useCalculatedMetrics, hydrationStore, nutritionStore |
| `useProfileLogic` | `src/hooks/useProfileLogic.ts` | profileStore (all 4 sections), userStore |
| `useCalculatedMetrics` | `src/hooks/useCalculatedMetrics.ts` | profileStore (reactive subscriptions) |
| `useProgressScreen` | `src/hooks/useProgressScreen.ts` | profileStore.personalInfo, useCalculatedMetrics |
| `useAIMealGeneration` | `src/hooks/useAIMealGeneration.ts` | profileStore, useCalculatedMetrics |

---

## F. Generation Pipelines

### F.1 Diet Generation — End-to-End Flow

```
useMealPlanning hook
  ├── Reads from profileStore (all 5 sections)
  ├── Gets calorieTarget from useCalculatedMetrics
  └── Calls aiService.generateWeeklyMealPlanAsync()
        │
        └── transformForDietRequest() [src/services/aiRequestTransformers.ts]
              Builds DietGenerationRequest → POST /diet/generate
              │
              └── Cloudflare Worker [fitai-workers/src/handlers/dietGeneration.ts]
                    ├── Zod validates request
                    ├── Loads stored data from Supabase (merge: request wins)
                    ├── buildDietPrompt() with DietPlaceholders
                    ├── AI generates (Gemini 2.5 Flash)
                    ├── filterDisabledMeals()
                    ├── validateDietPlan() — allergens, diet violations, calorie drift
                    └── adjustForProteinTarget() — mathematical portion adjustment
```

### F.1.1 All Fields Sent to Diet Worker

**Profile:**
`age`, `gender`, `weight`, `height`, `country`, `state`, `activity_level`, `fitness_goal`, `occupation_type`, `wake_time`, `sleep_time`

**Diet Preferences (all 32+ fields):**
`diet_type`, `allergies[]`, `restrictions[]`, `cuisine_preferences[]`, `snacks_count`,
6 readiness toggles, 4 meal enabled toggles,
`cooking_skill_level`, `max_prep_time_minutes`, `budget_level`,
14 health habit booleans

**Body Metrics:**
`height_cm`, `current_weight_kg`, `target_weight_kg`, `body_fat_percentage`,
`medical_conditions[]`, `medications[]`, `physical_limitations[]`,
`pregnancy_status`, `pregnancy_trimester`, `breastfeeding_status`, `stress_level`

**Advanced Review:**
`daily_calories`, `daily_protein_g`, `daily_carbs_g`, `daily_fat_g`,
`daily_water_ml`, `daily_fiber_g`, `calculated_bmi`, `bmi_category`, `health_score`

**Other:** `calorieTarget`, `mealsPerDay`, `daysCount`, `dietaryRestrictions[]`, `excludeIngredients[]`

### F.1.2 Diet Prompt Placeholders (DietPlaceholders)

All in `fitai-workers/src/prompts/diet/types.ts`:

| Placeholder | Source | Used In |
|------------|--------|---------|
| `CALORIES` | `daily_calories` | All 5 prompt templates |
| `PROTEIN` | `daily_protein_g` | All templates |
| `CARBS` | `daily_carbs_g` | All templates |
| `FATS` | `daily_fat_g` | All templates |
| `FIBER` | `daily_fiber_g` | All templates |
| `WATER_LITERS` | `daily_water_ml / 1000` | All templates |
| `DIET_TYPE` | `diet_type` | Routes to specialized template |
| `ALLERGIES` | `allergies[]` joined | All templates + allergen validation |
| `RESTRICTIONS` | `restrictions[]` joined | All templates + violation check |
| `CUISINE` | Auto-detected from country | All templates |
| `CUISINE_PREFERENCES` | `cuisine_preferences[]` joined (Wave 2D) | All 5 templates — prioritized over auto-detected |
| `COOKING_SKILL` | `cooking_skill_level` | Generates skill-appropriate instructions |
| `MAX_PREP_TIME` | `max_prep_time_minutes` | Prep time constraints |
| `BUDGET_LEVEL` | `budget_level` | Ingredient cost constraints |
| `MEALS_ENABLED` | 4 meal toggles | Determines meal slots |
| `MEAL_EXCLUSION_INSTRUCTIONS` | Disabled meals | Exclusion guidance |
| `AGE`, `GENDER`, `COUNTRY`, `STATE` | Profile data | Context |
| `BMI`, `BMI_CATEGORY` | Advanced review | Health context |
| `MEDICAL_CONDITIONS`, `MEDICATIONS` | Body analysis | Clinical context |
| `PREGNANCY_STATUS/TRIMESTER`, `BREASTFEEDING_STATUS` | Body analysis | Safety |
| `STRESS_LEVEL` | Body analysis | "favour stable energy" guidance |
| 6 readiness toggles | Diet preferences | Per-template guidance |
| 14 health habits | Diet preferences | `getPersonalizedSuggestions()` output |

**Prompt routing:** `diet_type` routes to specialized templates: `nonVeg.ts`, `vegetarian.ts`, `vegan.ts`, `pescatarian.ts`, `keto.ts`

### F.2 Workout Generation — 5 Paths

#### Path A: AI Weekly Plan (Primary)
```
useFitnessLogic
  → aiService.generateWeeklyWorkoutPlan(personalInfo, fitnessGoals, weekNum, {
      bodyMetrics, workoutPreferences, advancedReview
    })
  → transformForWorkoutRequest() [src/services/aiRequestTransformers.ts]
  → fitaiWorkersClient.generateWorkoutPlan()
  → POST /workout/generate → Cloudflare Worker
```

#### Path B: Quick Local Workout (Offline)
```
workoutEngine.generateQuickWorkout(personalInfo, fitnessGoals, timeAvailable)
  → Local EXERCISES database, bodyweight-only
  → Uses experience level, goals, age, weight for sets/reps/rest
```

#### Path C: Custom Template (CreateWorkoutScreen)
```
User manually picks exercises → sets/repRange/rest/targetWeight
  → Saved as WorkoutTemplate → workout_templates table
  → Can start immediately via buildDayWorkoutFromTemplate()
```

#### Path D: Schedule Builder (ScheduleBuilderScreen)
```
Assign templates/exercises to days → WeeklyWorkoutPlan
  → Saved as customWeeklyPlan → weekly_workout_plans (plan_source='custom')
```

#### Path E: Single AI Workout
```
workoutEngine.generateSmartWorkout() → aiService.generateWorkout()
  → Same backend as weekly plan, returns single workout
```

### F.2.1 All Fields Sent to Workout Worker (Path A)

**Profile:**
`age`, `gender`, `weight`, `height`, `fitnessGoal` (from `primary_goals[0]`),
`experienceLevel` (from `intensity`), `workoutDuration` (from `time_preference`)

**Equipment & Location:**
`availableEquipment[]` (mapped from `equipment`), `workoutLocation` (from `location` — Wave 2E)

**Fitness Assessment (Wave 2E):**
`fitnessAssessment.pushupCount`, `fitnessAssessment.runningMinutes`,
`fitnessAssessment.flexibilityLevel`, `fitnessAssessment.experienceYears`

**Preferences:**
`workoutsPerWeek`, `workoutTypes[]`, `prefersVariety`,
`preferredWorkoutTime`, `enjoysCardio`, `enjoysStrength` (Wave 2E),
`activityLevel`

**Medical/Safety:**
`injuries[]` (from `physical_limitations`), `medicalConditions[]`, `medications[]`,
`pregnancyStatus`, `pregnancyTrimester`, `breastfeedingStatus`, `stressLevel`

**Health Recommendations (Wave 2E):**
`recommendations.frequency`, `recommendations.cardioMinutes`, `recommendations.strengthSessions`

**Worker also loads from Supabase:**
`advanced_review`: BMR, TDEE, HR zones, VO2 max — injected into AI prompt as health context

### F.3 Session Tracking Data Model

#### Per-Set Data (`exercise_sets` table)
| Field | Type | Source |
|-------|------|--------|
| `weight_kg` | decimal | User input via SetLogModal |
| `reps` | integer | User input |
| `rpe` | smallint (1-3) | User input (Easy/Just Right/Hard) |
| `set_type` | text | normal/warmup/failure/drop |
| `is_completed` | boolean | User marks complete |
| `is_calibration` | boolean | First-time weight finding |
| `duration_seconds` | integer | For time-based exercises |

#### Per-Session Data (`workout_sessions` table)
| Field | Type | Source |
|-------|------|--------|
| `duration` / `total_duration_minutes` | integer | Timer elapsed |
| `calories_burned` | integer | MET-based calc at completion |
| `workout_name` | text | Plan workout title |
| `workout_type` | text | Plan workout category |
| `is_completed` | boolean | true on completion |
| `workout_plan_id` | uuid | Linked to parent plan (Wave 3B) |
| `planned_day_key` | text | Day identifier in plan |
| `is_extra` | boolean | true for unplanned workouts |

#### Progressive Overload (Double Progression)
1. Work within a rep range (e.g., 8-12)
2. When ALL sets hit top of range → increase weight
3. RPE modulates: RPE 1 (Easy) = double jump, RPE 2 = standard, RPE 3 (Hard) = hold
4. Two consecutive failed sessions → deload to 90%
5. Upper body increment: 2.5 kg, Lower body: 5.0 kg

#### Deload System
- **Proactive:** Mesocycle week 5+ → 40% volume reduction suggestion
- **Reactive:** 2+ sessions where >50% sets below rep floor → 10% weight reduction

---

## G. Resolved Issues Log

All issues discovered during the 2026-04-02 data audit and their resolution:

| ID | Severity | Issue | Wave | Resolution | Files Changed |
|----|----------|-------|------|------------|---------------|
| H1 | P0 | `bmi_category` written to non-existent DB column — silently lost | 1 | Migration `20260402000000` added column | 1 SQL |
| H2 | P0 | `health_grade` written to non-existent DB column — silently lost | 1 | Migration `20260402000000` added column | 1 SQL |
| H3 | P0 | `health_score` dead write (actual column is `overall_health_score`) | 2B | Removed dead write from `AdvancedReviewService.save()` | `onboardingService.ts` |
| H4 | P0 | `cuisine_preferences` collected but never persisted or used in diet generation | 1+2D | Column added + wired into save/load + all 5 diet prompt templates | 14 files |
| H5 | P0 | `snacks_count` collected but never persisted or used | 1+2D | Column added + wired into save/load + meal count logic | 14 files |
| H6 | P1 | `activity_level: "extreme"` vs `"very_active"` enum mismatch | 2A | Mapping functions + defense-in-depth aliases in 12 calculator files | 16 files |
| H7 | P1 | `diet_type` enum divergence (`"non-veg"/"balanced"` vs `"omnivore"`) | 2A | Mapping functions at boundaries in `typeTransformers.ts` | 16 files |
| H8 | P2 | `useCalculatedMetrics` bypassed profileStore, read from Supabase with 5-min cache | 3A | Refactored to read from profileStore via Zustand subscriptions | `useCalculatedMetrics.ts` |
| H9 | P2 | `supabase.ts` Database interface severely stale (missing 5 tables) | 3A | Staleness warning added with TODO for `npx supabase gen types` | `supabase.ts` |
| H10 | P2 | `fitness_goals` vs `workout_preferences` dual table overlap | 3A | `checkProfileComplete()` now reads `workout_preferences` first | `userStore.ts` |
| H11 | P2 | `toAppFormat()` doubled every key (both snake_case and camelCase) | 3B | Key doubling removed (zero external callers found) | `typeTransformers.ts` |
| H13 | P2 | 13 workout onboarding fields collected but never used in generation | 2E | 10 fields wired end-to-end into workout generation | 9 files |
| H14 | P3 | Hardcoded `70kg` weight fallback for water calculation | 2C | Replaced with `null` + `console.warn` | `useReviewValidation.ts` |
| H15 | P3 | Hardcoded `age=25, male` BMR fallback in Tab 3 preview | 2C | Replaced with `null` + `console.warn` | `useBodyAnalysis.ts` |
| H16 | P3 | Hardcoded `"IN"` (India) country fallback in 5 locations | 2C | Replaced with `null` + `console.warn` in all 5 locations | 5 files |
| H17 | P4 | 5 dead fields never computed during onboarding | 2B | `bmi_health_risk`, `bmr_formula_used`, `vo2_max_classification` now computed. `detected_ethnicity` left null (no consumers). | `master-engine.ts`, `cardiovascular.ts` |
| H21 | P4 | Two `OnboardingReviewData` definitions out of sync | 3B | `legacy.ts` now re-exports from canonical `onboarding.ts` | `legacy.ts` |
| H22 | P4 | Hydration goal set in 2 places (useHomeLogic + useNutritionTracking) | 3B | Removed from `useHomeLogic`, kept in `useNutritionTracking` (SSOT) | `useHomeLogic.ts` |
| H23 | P4 | `workout_sessions.workout_plan_id` always null | 3B | Wired to `workoutSourcePlan.databaseId` | `completionTracking.ts` |
| H18 | P3 | Duplicate DB writes (`duration`/`exercises`/`enjoyment_rating`) | 9 | Consolidated to canonical columns, removed duplicate writes | `completionTracking.ts`, `extraWorkoutService.ts`, `workout-completion.ts` |
| H19 | P3 | `workout_templates.last_used_at` never written | 9 | Updated RPC + fallback to set `last_used_at = NOW()` | `workoutTemplateService.ts`, migration, RPC |
| H20 | P3 | `exercise_prs.reps` column never written | 9 | Added `reps` param to `recordPR()`, updated all 3 callers | `prDetectionService.ts`, `completionTracking.ts`, `SetLogModal.tsx`, `ExerciseCard.tsx` |
| H24 | P2 | No rating/notes UI on workout completion | 9 | Added star rating + notes input to `WorkoutCompleteDialog`, saved via Supabase update | `CustomDialog.tsx`, `WorkoutSessionScreen.tsx` |
| — | P2 | `supabase.ts` Database interface stale (missing 5+ tables) | 9 | Regenerated via `npx supabase gen types`, re-exported from generated file | `supabase.ts`, `supabase-types.generated.ts` |
| — | P2 | Template builder hardcoded equipment list | 9 | Reads user's `equipment[]` + `location` from `profileStore` | `CreateWorkoutScreen.tsx` |
| — | P4 | `detected_ethnicity` never computed | 10 | `master-engine.ts` calls `detectEthnicity()` from `autoDetection.ts` | `master-engine.ts` |
| — | P2 | `fitness_goals` table full deprecation | 10 | All reads/writes migrated to `workout_preferences`. Profile edit, integration, fitnessData all use `workout_preferences` | `userProfile.ts`, `user-profile/index.ts`, `fitnessData.ts`, `preferences.service.ts`, `GoalsPreferencesEditModal.tsx`, `integration.ts`, `integration/onboarding.ts` |
| — | P3 | `cooking_methods` never collected in onboarding | 10 | Full end-to-end: type, DB migration, save/load, UI, client-to-worker pipeline | `onboarding.ts`, `dietPreferencesService.ts`, `CookingPreferencesSection.tsx`, `aiRequestTransformers.ts`, migration |
| — | P3 | `wake_time`/`sleep_time` in diet generation | 10 | Confirmed already wired end-to-end (client → Workers → prompt) | `aiRequestTransformers.ts`, Workers diet prompts |
| — | P4 | 3 remaining workout fields (`enjoys_group_classes`, `prefers_outdoor`, `needs_motivation`) | 10 | Confirmed already wired end-to-end | `aiRequestTransformers.ts`, Workers `workoutGeneration.ts` |

**Total: 31 issues resolved across 10 waves, ~80 file modifications, zero new TypeScript errors introduced.**

---

## H. Remaining Technical Debt

### ~~H18: Dead/Redundant DB Columns in `workout_sessions`~~ — RESOLVED (2026-04-03)
- **Resolution:** Consolidated writes to use canonical columns: `rating` (read by dataTransformation.ts), `total_duration_minutes`, `exercises_completed`. Removed `exercises` (duplicate JSONB) and `enjoyment_rating` (never read) from write paths in `completionTracking.ts`. Added `total_duration_minutes` + `exercises_completed` to `completion-tracking/workout-completion.ts` which was missing them. Old `duration` column still written for backward compat but reads use `total_duration_minutes`.
- **Files:** `completionTracking.ts`, `extraWorkoutService.ts`, `completion-tracking/workout-completion.ts`

### ~~H19: `workout_templates.last_used_at` Never Written~~ — RESOLVED (2026-04-03)
- **Resolution:** Updated `increment_template_usage_count` RPC to set `last_used_at = NOW()`. Updated fallback path in `workoutTemplateService.ts` to also set `last_used_at`.
- **Migration:** `20260403000000_fix_remaining_tech_debt.sql`
- **Files:** `workoutTemplateService.ts`, RPC function, migration

### ~~H20: `exercise_prs.reps` Column Never Written~~ — RESOLVED (2026-04-03)
- **Resolution:** Added `reps` parameter to `prDetectionService.recordPR()`. Updated all 3 callers to pass reps: `completionTracking.ts` (belt-and-suspenders PR detection), `SetLogModal.tsx` (live set logging), `ExerciseCard.tsx` (inline PR detection).
- **Files:** `prDetectionService.ts`, `completionTracking.ts`, `SetLogModal.tsx`, `ExerciseCard.tsx`

### ~~H24: No User Notes or Rating UI for Workout Sessions~~ — RESOLVED (2026-04-03)
- **Resolution:** Added star rating (1-5) and free-text notes input to `WorkoutCompleteDialog`. On dismiss, rating/notes are saved via `supabase.update()` to `workout_sessions.rating` and `workout_sessions.notes`.
- **Files:** `CustomDialog.tsx`, `WorkoutSessionScreen.tsx`

### Other Items
| Item | Status | Priority |
|------|--------|----------|
| ~~`detected_ethnicity` never computed~~ | **RESOLVED** (2026-04-03): `master-engine.ts` now calls `detectEthnicity()` from `autoDetection.ts` and sets `detected_ethnicity` in `AdvancedReviewData` output | ~~Low~~ |
| ~~`supabase.ts` Database interface regen~~ | **RESOLVED** (2026-04-03): `supabase-types.generated.ts` auto-generated, `supabase.ts` re-exports | ~~Medium~~ |
| ~~`fitness_goals` table full deprecation~~ | **RESOLVED** (2026-04-03): All reads/writes migrated to `workout_preferences`. `getCompleteProfile()` synthesizes `fitnessGoals` from `workout_preferences`. Profile edit modal, `integration.ts`, `fitnessData.ts` all write to `workout_preferences` now. `fitness-goals.ts` service retained but unused. | ~~Medium~~ |
| ~~Template builder uses hardcoded equipment list~~ | **RESOLVED** (2026-04-03): `CreateWorkoutScreen` reads from `profileStore.workoutPreferences.equipment` | ~~Medium~~ |
| ~~`wake_time`/`sleep_time` unused in diet generation~~ | **RESOLVED** (2026-04-03): Wired end-to-end — `aiRequestTransformers.ts` sends `wake_time`/`sleep_time`, Workers Zod accepts them, `buildPlaceholdersFromUserData` sets `WAKE_TIME`/`SLEEP_TIME`, `buildPlanStructureRequirements` emits meal timing context | ~~Low~~ |
| ~~`cooking_methods` never collected in onboarding~~ | **RESOLVED** (2026-04-03): Added `cooking_methods: string[]` to `DietPreferencesData`, DB migration, save/load in `dietPreferencesService`, UI multi-select in `CookingPreferencesSection`, wired through `aiRequestTransformers.ts` to Workers | ~~Low~~ |
| Calorie fallback in `aiRequestTransformers.ts` | **ACCEPTABLE** — 1800/2200/2800 hardcoded fallback kept with `console.warn`. Needed when no calorie target exists (guest users, incomplete onboarding). Not a bug. | Low |
| ~~3 remaining ignored workout fields~~ | **RESOLVED** (2026-04-03): `enjoys_group_classes`, `prefers_outdoor_activities`, `needs_motivation` confirmed already wired end-to-end — client sends via `aiRequestTransformers.ts`, Workers Zod accepts, `buildWorkoutPrompt` uses them in preference section | ~~Low~~ |

---

> **Document maintenance:** Update this file when making changes to data flow, adding/removing fields, modifying calculations, or resolving technical debt items above. Reference this document in code reviews for data architecture decisions.
