# FitAI Data Architecture

> **Last updated:** 2026-06-20 (Wave 3 — `health_metrics` Supabase persistence for Health Connect data + manual health-data entry fallback for unsupported watches. Plus Wave 2: Health Connect as sole Android health-data path; Google Fit removed. Plus nutrition/analytics/auth layer hardening — P0–P3 fixes)
> **Status:** All issues from Waves 1–10 resolved. Onboarding calculation engine hardened. Choose Your Pace is now unambiguous. Nutrition/analytics/auth SSOT fixes (P0-1…P3-23) applied. Wave 2: Android wearable subsystem migrated from Google Fit to Health Connect. Wave 3: Health Connect metrics now persist to `health_metrics` Supabase table; manual entry fallback live for unsupported watches (Noise/boAt/Fire-Boltt/Huawei).

## Table of Contents

- [A. Data Model & Variable Inventory](#a-data-model--variable-inventory)
- [B. Persistence & Sync Architecture](#b-persistence--sync-architecture)
- [C. Calculation Engine](#c-calculation-engine)
- [D. Naming Conventions & Type Mapping](#d-naming-conventions--type-mapping)
- [E. Main App Data Consumption](#e-main-app-data-consumption)
- [F. Generation Pipelines](#f-generation-pipelines)
- [G. Resolved Issues Log](#g-resolved-issues-log)
- [H. Remaining Technical Debt](#h-remaining-technical-debt)
- [I. Android Wearable / Health Connect Subsystem](#i-android-wearable--health-connect-subsystem)

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
| `health_metrics` | `id` (uuid) | `user_id → auth.users` (ON DELETE CASCADE) | Daily health-metric history from Health Connect (automatic) and manual entry (Wave 3). One authoritative value per user/day/metric via UNIQUE(user_id, date, metric_type). See §I.4. |
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
- `nutritionStore` — Meal logs, nutrition tracking. NOT onboarding data. Consumed-nutrition selectors (`getConsumedNutrition`/`getTodaysConsumedNutrition`) are the SSOT and live on the store itself; the divergent `nutrition/selectors.ts` was deleted (P0-2, 2026-06-20).
- `hydrationStore` — Water tracking (runtime state). Goal set exclusively in `useNutritionTracking` (SSOT — P1-10, 2026-06-20; previously also set in `useHomeLogic` causing a race). **Water intake SSOT:** `water_logs` table in Supabase (P0-1). `analytics_metrics.water_intake_ml` is DERIVED from `water_logs` at read time, never independently accumulated.
- `healthDataStore` (`src/stores/healthDataStore.ts`) — Android Health Connect metrics. NOT onboarding data. Runtime source for steps, heart rate, resting heart rate, active/total calories, distance, weight, sleep hours, recent workouts, heartRateVariability, oxygenSaturation, bodyFat. **Persisted to the `health_metrics` Supabase table (Wave 3)** via fire-and-forget `saveHealthSnapshot` after each `syncFromHealthConnect` store update — persistence failures never block UI sync. Historical read-back is via the `loadHealthMetricsHistory(days=30)` action, which populates `metricsHistory` for charts. The `weight` metric additionally propagates to `profileStore.bodyAnalysis.current_weight_kg` → `body_analysis` table (the existing onboarding table — unchanged). See §I for the full data flow.

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
Weight Loss: TDEE − (weeklyRate × CALORIE_PER_KG / 7), floor at BMR (enforced in core.ts)
Weight Gain: TDEE + min(dailySurplus, TDEE × MAX_SURPLUS_FRACTION)   ← cap 10% (lean bulk science)
Maintenance: TDEE

Constants (from src/services/validation/constants.ts — SINGLE SOURCE OF TRUTH):
  CALORIE_PER_KG = 7700        // 1 kg body fat ≈ 7700 kcal (Wishnofsky)
  MAX_SURPLUS_FRACTION = 0.10  // lean bulk cap
  MIN_CALORIES_MALE = 1500     // ACSM minimum
  MIN_CALORIES_FEMALE = 1200   // ACSM minimum
  DAYS_PER_WEEK = 7
  DEFAULT_EXERCISE_SESSIONS_PER_WEEK = 5
```

**BMR floor (enforcement layer — core.ts only):**
The floor at BMR applies to the *actual plan* enforced by `ValidationEngine.core`. It is NOT applied in `calculateSmartAlternatives` — the cards in Choose Your Pace show the TRUE required calories for each rate so the user can make an informed decision. `isBelowBMR = true` on those cards tells the UI to render them with danger styling.

**Medical adjustments** preserve the deficit ratio: `targetCalories × (adjustedTDEE / tdee)`

**Minimum absolute floor:** `minimumCalorieFloor` (1500 male / 1200 female) — below this the card is `isBlocked = true` and cannot be selected.

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

### C.10 Choose Your Pace — Scenario Matrix

All alternative cards are generated by `calculateSmartAlternatives()` in `src/services/validation/smartAlternatives.ts`.

#### Scenario A: User's rate requires calories below BMR (most common aggressive case)
| Card | Calories | Rate | Timeline | Badge | `isBelowBMR` |
|------|----------|------|----------|-------|--------------|
| KEEP MY GOAL | TRUE required (e.g. 1661 cal) | user's rate (1.06) | user's timeline (16 wk) | RISKY / DANGEROUS | ✅ true |
| AGGRESSIVE | TRUE required (e.g. 1727 cal) | 1.0 kg/wk | ceil (17 wk) | RISKY | ✅ true |
| **GOAL + EXERCISE** ★ | BMR (1856 cal) | same as user's rate (1.06) | same timeline (16 wk) | **SMART PICK** | ❌ false |
| AT YOUR BMR ★ | BMR (1856 cal) | bmrDeficit×7/CALORIE_PER_KG (0.88) | 20 wk | Recommended | ❌ false |
| LIGHT ACTIVITY | BMR (1856 cal) | bmrRate + lightBurn | 18 wk | Easy | ❌ false |
| MODERATE ACTIVITY | BMR (1856 cal) | bmrRate + moderateBurn | 15 wk | Active | ❌ false |
| INTENSE ACTIVITY | BMR (1856 cal) | bmrRate + intenseBurn | 13 wk | Intense | ❌ false |

**GOAL + EXERCISE formula:**
```
exerciseBurnNeeded = (userRate × CALORIE_PER_KG / 7) − (tdee − bmr)   // extra cal/day via exercise

// MET is NOT hardcoded — derived from the same shared table as core.ts:
burnPer60Min = MetabolicCalculations.estimateSessionCalorieBurn(60, "intermediate", weight, ["cardio","mixed"])
calsPerMinute = burnPer60Min / 60                             // = MET × weight / 60

minsPerSession = ceil(exerciseBurnNeeded / calsPerMinute / DEFAULT_EXERCISE_SESSIONS_PER_WEEK × 7)

// The card carries exerciseSessions so handleRateSelection syncs the EXACT
// session count to workoutPreferences.workout_frequency_per_week (BUG-44 fix).
```
This card is only generated when `exerciseBurnNeeded ∈ (0, 700]` cal/day — above 700 it would require excessive exercise.

#### Scenario B: User's rate is achievable (calories ≥ BMR) but aggressive (>20% deficit)
- KEEP MY GOAL: shows actual required calories, badge = Easy/Recommended
- Standard alternatives rendered without `isBelowBMR`
- GOAL + EXERCISE not generated (not needed)

#### Scenario C: User's rate is safe
- All diet alternatives comfortably above BMR
- Standard badges (Easy, Recommended)

#### UI Rendering (AlternativeOption.tsx)
- `isBelowBMR = true` → calories shown in **red** with ⚠️ icon
- Sub-line: "⚠ Requires eating below your BMR — not sustainable long-term"
- Badge RISKY/DANGEROUS rendered in caution/danger colors
- `isBelowBMR = false` → normal muted color calories

#### SSOT Chain for Choose Your Pace
```
useReviewValidation
  → originalRateRef (frozen on first render, reset only on weight field change)
  → calculateSmartAlternatives(frozenRate, bmr, tdee, ...)
      → diet alternatives: TRUE required calories, isBelowBMR flag
      → GOAL + EXERCISE: BMR calories, safe, achieves user's exact goal via exercise
      → exercise alternatives: BMR diet + exercise burn = higher sustainable rate
  → AdvancedReviewTab
      → selectedAlternativeId derived from workoutPreferences.weekly_weight_loss_goal (SSOT)
      → no transient state for selection
```

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

### D.2 Enum Mappings (Fixed in Wave 2A; centralized + readiness-override guard added 2026-06-20)

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
| `"balanced"` | `"omnivore"` | `mapDietTypeForHealthCalc()` (explicit: "balanced" is the onboarding label for a mixed/omnivorous diet; there is no separate "balanced" DietType in health-calc) |

**Specialized DietTypes (from readiness flags, NOT user-selectable onboarding diet_type):**
| Health Calc Value | Source | Eligible to override base diet? |
|-------------------|--------|---------------------------------|
| `"keto"` | `keto_ready` | Only when base diet is `omnivore` (keto is not vegan/vegetarian-safe) |
| `"low_carb"` | `low_carb_ready` | Only when base diet is `omnivore` |
| `"paleo"` | `paleo_ready` | Only when base diet is `omnivore` |
| `"mediterranean"` | `mediterranean_ready` | `omnivore` OR `pescatarian` (fish + olive oil compatible) |

**Readiness-override SAFETY GUARD (P0-3, 2026-06-20):** A readiness flag must NOT silently override a medically-incompatible explicit user diet choice. Previously `resolveDietType` let `keto_ready` override a vegan diet → keto is not vegan-safe, a dangerous mismatch. Now: the override only applies when the base diet is compatible (`omnivore`, or `pescatarian` for mediterranean). On conflict, the user's explicit choice wins and a `console.warn` surfaces the conflict so it can be reconciled. `high_protein_ready` remains an AI-only flag and never changes the macro DietType.

**Defense-in-depth:** All calculator lookup maps also accept `"extreme"` as a direct key (aliased to same value as `"very_active"`), preventing silent fallback errors.

Functions in `src/utils/typeTransformers.ts` (all four now EXIST — previously only `mapActivityLevelForHealthCalc` was real; the other three were phantom and have been created 2026-06-20):
- `mapActivityLevelForHealthCalc(onboardingLevel)` → health calc value
- `mapActivityLevelForOnboarding(healthCalcLevel)` → onboarding value (unknown → `"moderate"` + warn)
- `mapDietTypeForHealthCalc(onboardingDietType)` → health calc value (unknown → `"omnivore"` + warn)
- `mapDietTypeForOnboarding(healthCalcDietType)` → onboarding value (specialized diets collapse to `"balanced"`; unknown → `"balanced"` + warn)

`resolveDietType` in `src/utils/healthCalculations/nutritional.ts` uses `mapDietTypeForHealthCalc` as the SSOT for the base diet and layers the readiness-override guard on top.

### D.3 Boundary Mapping Functions

All in `src/utils/typeTransformers.ts`:

| Function | Purpose |
|----------|---------|
| `toDbFormat(data)` | Generic camelCase → snake_case conversion (deep, handles nested objects/arrays) |
| `normalizeToSnakeCase(data)` | Normalize mixed-case objects to snake_case using `FIELD_MAPPINGS` |
| `mapActivityLevelForHealthCalc()` | Onboarding → health calc activity level |
| `mapActivityLevelForOnboarding()` | Health calc → onboarding activity level (inverse) |
| `mapDietTypeForHealthCalc()` | Onboarding → health calc diet type |
| `mapDietTypeForOnboarding()` | Health calc → onboarding diet type (inverse) |
| `FIELD_MAPPINGS` | Static mapping table of snake↔camel pairs (used by `normalizeToSnakeCase`) |

**Note (P1-9, 2026-06-20):** The doc previously claimed `toAppFormat()` and `normalizeToCamelCase()` existed. They never did — only `toDbFormat` and `normalizeToSnakeCase` are real. The "removed in Wave 3B" claim about `toAppFormat()` key-doubling referred to a function that never existed in this codebase; the actual Wave 3B change was to `toDbFormat`'s duplicate-key skip logic. The doc has been corrected to reference the real functions only.

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
| H22 | P4 | Hydration goal set in 2 places (useHomeLogic + useNutritionTracking) | 3B | Removed from `useHomeLogic`, kept in `useNutritionTracking` (SSOT) | `useHomeLogic.ts` — **NOTE (2026-06-20):** the 3B resolution was incomplete; the `setDailyGoalFromMetrics` call was still present in `useHomeLogic` until P1-10 removed it for real. `useNutritionTracking` is now the true sole SSOT. |
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

**Total: 39 issues resolved across 11 waves, ~98 file modifications, zero new TypeScript errors introduced.**

### Nutrition / Analytics / Auth Layer Hardening (2026-06-20)

| ID | Severity | Issue | Resolution | Files Changed |
|----|----------|-------|------------|---------------|
| P0-1 | P0 | Water intake stored in TWO Supabase tables (`water_logs` + `analytics_metrics.water_intake_ml`), no reconciliation | `water_logs` is now the single source of truth. `analytics_metrics.water_intake_ml` is DERIVED at read time from `water_logs` (sum per day) in `getTodaysMetrics` / `loadMetricsHistory`. The independent accumulate write in `updateTodaysMetrics` was removed; the column is retained for back-compat with older readers but never independently accumulated. | `analyticsData.ts` |
| P0-2 | P0 | Duplicate divergent `getConsumedNutrition` in `nutrition/selectors.ts` (included planned-but-not-logged meals — explicitly forbidden by store comment) | Deleted `nutrition/selectors.ts`. Exported `clearConsumedNutritionCaches` from `nutritionStore.ts`; `clearUserData.ts` now calls it (replaces `clearNutritionCache`). Only importer was `clearUserData.ts` (verified). | `nutritionStore.ts`, `clearUserData.ts`, `clearUserData.test.ts` (deleted `selectors.ts`) |
| P0-3 | P0 | `diet_type` enum divergence, no centralized mapper; readiness flags silently overrode medically-incompatible explicit diet choices (vegan + keto_ready → keto) | Centralized mappers in `typeTransformers.ts`: `mapDietTypeForHealthCalc`, `mapDietTypeForOnboarding`, `mapActivityLevelForOnboarding` (previously phantom). `resolveDietType` now uses `mapDietTypeForHealthCalc` as SSOT and applies a SAFETY GUARD: readiness flags only override when the base diet is compatible (omnivore, or pescatarian for mediterranean); on conflict the explicit user choice wins + `console.warn`. | `typeTransformers.ts`, `nutritional.ts` |
| P0-4 | P0 | `nutritionStore` realtime triggered full `loadData()` on every meal_logs event, wiping in-flight (progress<100) local state | Added `handleMealLogRealtimeChange` — incremental INSERT/UPDATE/DELETE handler that updates only the affected row, preserving in-flight progress. Falls back to `loadData()` only if the incremental path throws. | `nutritionStore.ts` |
| P1-5 | P1 | `persistData` overwrote `loggedAt` with `now()` on every persist → meals shifted into today's totals after midnight | `loggedAt` is now preserved from `meal.loggedAt`/`meal.createdAt`; only set on first creation. | `nutritionStore.ts` |
| P1-6 | P1 | `"guest"` user_id reached real DB writes via `saveWeeklyMealPlan` / `completeMeal` (`getUserIdOrGuest()` with no guard) → RLS rejected, retried indefinitely, queue pollution | Added `getSyncableUserId()` helper (returns null for guest/unauthenticated). Both queue sites now skip queueing for guests (local-only). | `nutritionStore.ts` |
| P1-7 | P1 | Auth session dual-persisted: AsyncStorage `auth_session` (tokens) + Supabase SecureStore adapter | Supabase SecureStore adapter is now the canonical token store. AsyncStorage holds ONLY the `AuthUser` (display data) under `auth_user_cache` for fast cold-start render. `restoreCachedSession` no longer trusts AsyncStorage expiry; `revalidateSession` always revalidates via `supabase.auth.getSession()`. Refresh uses tokenless `refreshSession()` (SDK reads from SecureStore). | `auth.ts` |
| P1-8 | P1 | `metricsHistory` triple-stored (engine AsyncStorage, store AsyncStorage, Supabase) | Supabase `analytics_metrics` is now canonical. `analyticsEngine.loadMetricsHistory` loads from Supabase for authed users (AsyncStorage only as guest/offline fallback). `saveMetricsHistory` skips the AsyncStorage write for authed users (no dual-write). | `analyticsEngine.ts` |
| P1-9 | P1 | Doc referenced phantom functions (`mapActivityLevelForOnboarding`, `mapDietTypeForHealthCalc`, `mapDietTypeForOnboarding`, `toAppFormat`, `normalizeToCamelCase`) | Resolved with P0-3 (mappers now exist). Doc D.2/D.3 corrected to reference real functions only; false "removed in Wave 3B" claim about `toAppFormat` struck. | `FITAI_DATA_ARCHITECTURE.md` |
| P1-10 | P1 | Doc falsely claimed hydration goal setter removed from `useHomeLogic` (H22) — it was still present, racing with `useNutritionTracking` | Removed `setDailyGoalFromMetrics` call from `useHomeLogic`. `useNutritionTracking` is now the true sole SSOT for the hydration goal. | `useHomeLogic.ts` |
| P2-11 | P2 | Meal completion marked via `"[COMPLETED]"` string-append to notes (spoofable, divergent from row-existence inference) | Added `is_completed BOOLEAN` column to `meal_logs` (migration `20260620000001`). `completeMeal`/`endMealSession` set `isCompleted: true`; `loadData` reads `is_completed` and only restores progress=100 for explicitly-completed logs. `MealLog` type gains optional `isCompleted`. | `nutritionStore.ts`, `localData.ts`, migration `20260620000001_add_meal_logs_is_completed.sql` |
| P2-12 | P2 | Streaks never persisted to Supabase → lost on reinstall/device change | Added `current_streak`/`longest_streak` columns to `analytics_metrics` (migration `20260620000002`). `analyticsDataService.saveStreaks`/`loadStreaks` added. `analyticsStore.initialize` loads persisted streaks; `generateAnalytics` persists after compute. | `analyticsData.ts`, `analyticsStore.ts`, migration `20260620000002_add_streaks_to_analytics_metrics.sql` |
| P2-13 | P2 | `currentStreak` overwritten with 0 when `generateAnalytics` threw "Insufficient data" | Catch block no longer sets `currentAnalytics: null` — preserves last known good value. Only `reset()` clears it. | `analyticsStore.ts` |
| P2-14 | P2 | `getProgressStats` ignored `timeRange` (fetched only 2 entries, claimed N-day coverage) | Now filters entries to the `timeRange` window (date cutoff), sorts ascending, computes change from range bounds (oldest vs newest in window). Falls back to all entries if none fall in window. | `progressData.ts` |
| P2-15 | P2 | Hardcoded `user_id: "local-user"` in `convertBodyMeasurementToProgressEntry` (sentinel other services skip-sync) | Accepts real `userId` param (threaded from `getUserProgressEntries`). If unavailable, leaves `user_id` empty + `console.warn` — never fabricates the sentinel. | `progressData.ts` |
| P3-16 | P3 | `handleRemoveWater` bypassed service layer (raw supabase delete with timezone-drifting date filter) | Added `hydrationDataService.removeLastTodayWaterLog` (uses `eq('date', getLocalDateString())`). `handleRemoveWater` routes through it. | `hydrationData.ts`, `useNutritionTracking.ts` |
| P3-17 | P3 | Dead empty `if (result.success) {}` in `syncHydrationWithSupabase` | Removed dead branch; documented as a thin wrapper over `getTodayWaterIntake`. | `hydrationData.ts` |
| P3-19 | P3 | 4 empty catch blocks in `uuid.ts` silently fell back to `Math.random` (PK collision risk) | All 4 now `console.error` before falling back. | `uuid.ts` |
| P3-20 | P3 | Supabase client created with empty anon key (only `console.warn`, every request silently rejected by RLS) | In production, now throws a fatal error at startup. In dev, still warns + creates the client for offline work. | `supabase.ts` |
| P3-21 | P3 | Derived `chartData` persisted to AsyncStorage (stale if generator logic changes) | Removed `chartData` from `partialize`; always regenerated from `metricsHistory` via `generateChartData()` on load. | `analyticsStore.ts` |
| P3-22 | P3 | `weightHistory`/`calorieHistory` duplicate `dailyMetricsHistory` (divergent fetch paths) | `setDailyMetricsHistory` now re-derives `weightHistory`/`calorieHistory` from the canonical `DailyMetrics[]` so they can't diverge. `setHistoryData` retained for the progress_entries/meals fallback paths. | `analyticsStore.ts` |
| P3-23 | P3 | `exerciseVolumeHistory`/`personalRecords` not persisted + no loading flag → empty UI with no loading state | Added `isLoadingExerciseAnalytics` flag; set true at start of `loadExerciseAnalytics`, false in `finally`. Reset on logout. | `analyticsStore.ts` |

**Total: 23 issues resolved (P0–P3), zero new TypeScript errors introduced (`npx tsc --noEmit` passes).**

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
| ~~Raw `7700` scattered across 13 files~~ | **RESOLVED** (2026-04-04): Created `src/services/validation/constants.ts` with `CALORIE_PER_KG = 7700` and other named constants. All 13 files now import from this single source. Zero raw `7700` in `.ts` files. | ~~Medium~~ |
| ~~Exercise card burns hardcoded (150/300/450)~~ | **RESOLVED** (2026-04-04): `smartAlternatives.ts` exercise options now use `MetabolicCalculations.estimateSessionCalorieBurn()` with user's actual weight. Burns are weight-dependent from the shared MET table. | ~~High~~ |
| ~~MET=7 hardcoded in GOAL+EXERCISE card~~ | **RESOLVED** (2026-04-04): Now uses `MetabolicCalculations.estimateSessionCalorieBurn(60, "intermediate", weight, [...])` — same function as core.ts. MET comes from the shared table in `metabolic.ts`. | ~~High~~ |
| ~~Exercise freq mismatch: card=5x, handler=3x~~ | **RESOLVED** (2026-04-04): Added `exerciseSessions` field to `SmartAlternative`. Card sets it, `handleRateSelection` reads it for `workout_frequency_per_week`. No more drift between card math and TDEE recalc. (BUG-44) | ~~High~~ |
| ~~AdjustmentWizard fallback strips exercise metadata~~ | **RESOLVED** (2026-04-04): Fallback SmartAlternative now wires `exerciseType`, `exerciseMinutes`, `exerciseSessions`, `exerciseDescription` from wizard's Alternative fields. (BUG-45) | ~~Medium~~ |
| ~~Card timeline vs chart timeline ±1 week drift~~ | **RESOLVED** (2026-04-04): `handleRateSelection` now uses `Math.ceil(weightToLose / weeklyRate)` — same formula as `smartAlternatives.ts` cards. (BUG-46) | ~~Low~~ |
| ~~bypassDeficitLimit skips stress-level guard~~ | **RESOLVED** (2026-04-04): Bypass mode now applies 15% conservative deficit ceiling for high-stress or medical-condition users. Normal users still see their requested goal with BMR floor only. (BUG-47) | ~~Medium~~ |
| Calorie fallback in `aiRequestTransformers.ts` | **ACCEPTABLE** — 1800/2200/2800 hardcoded fallback kept with `console.warn`. Needed when no calorie target exists (guest users, incomplete onboarding). Not a bug. | Low |
| ~~3 remaining ignored workout fields~~ | **RESOLVED** (2026-04-03): `enjoys_group_classes`, `prefers_outdoor_activities`, `needs_motivation` confirmed already wired end-to-end — client sends via `aiRequestTransformers.ts`, Workers Zod accepts, `buildWorkoutPrompt` uses them in preference section | ~~Low~~ |

---

> **Document maintenance:** Update this file when making changes to data flow, adding/removing fields, modifying calculations, or resolving technical debt items above. Reference this document in code reviews for data architecture decisions.

---

## I. Android Wearable / Health Connect Subsystem

> **Wave 2 (2026-06-20) → Wave 3 (2026-06-20).** This section documents the Android health-data ingestion path and its persistence layer. Wave 2 made Health Connect the sole Android health-data path (Google Fit removed). Wave 3 adds Supabase persistence (`health_metrics` table) for daily history plus a manual-entry fallback for watches without Health Connect support.

### I.1 Platform Strategy

| Platform | Health-data path | Status |
|----------|------------------|--------|
| Android | Android Health Connect (`react-native-health-connect` ^3.5.3) | ✅ Sole path (Wave 2) |
| iOS | Apple HealthKit (`expo-health-kit`) | ✅ Active (out of scope for this section) |
| ~~Android~~ | ~~Google Fit REST API + `react-native-google-fit`~~ | ❌ **REMOVED in Wave 2.** Google Fit REST API is deprecated (shutdown end-2026). `src/services/googleFit.ts` deleted, `react-native-google-fit` dependency removed, all Google Fit store actions removed. |

**Health Connect is the aggregation hub.** FitAI reads from Health Connect, not from individual watch SDKs. A smartwatch works with FitAI on Android **iff** its companion app writes to Health Connect. See `src/docs/WEARABLE_SUPPORT_MATRIX.md` for the per-brand matrix.

### I.2 Data Flow (Android)

```
Smartwatch / fitness band
  → Companion app (Samsung Health / Fitbit / Garmin Connect / Mi Fitness /
                   Zepp / Withings / OHealth / etc.)
  → Android Health Connect (OS aggregation hub)
  → healthConnectService.syncHealthData()           [src/services/health/core.ts]
      → per-metric readers in syncHelpers.ts          [src/services/health/syncHelpers.ts]
          syncSteps, syncHeartRate, syncActiveCalories,
          syncTotalCaloriesWithBMRFallback, syncDistance, syncWeight,
          syncSleep, syncExerciseSessions, syncHRV, syncSpO2, syncBodyFat
      → syncAllMetrics(ctx) orchestrates all readers
  → healthDataStore.metrics (Zustand)                [src/stores/healthDataStore.ts]
  → UI components (via selectors)
```

The legacy re-export shim `src/services/healthConnect.ts` (2 lines) exists only for backward-compat imports; the real implementation lives in `src/services/health/core.ts`. New code should import from `src/services/health/core.ts` (or the `src/services/health/index.ts` barrel).

### I.3 Metrics Surfaced in `healthDataStore`

| Metric | Store field | HC record type | Notes |
|--------|-------------|----------------|-------|
| Steps | `metrics.steps` | `Steps` | Daily aggregate |
| Heart rate | `metrics.heartRate` | `HeartRate` | Latest sample |
| Resting heart rate | `metrics.restingHeartRate` | `HeartRate` | Derived |
| Active calories | `metrics.activeCalories` | `ActiveCaloriesBurned` | Exercise only |
| Total calories | `metrics.totalCalories` | `TotalCaloriesBurned` | BMR fallback via `BasalMetabolicRate` when total unavailable |
| Distance | `metrics.distance` | `Distance` | Meters |
| Weight | `metrics.weight` | `Weight` | ⚠️ ALSO propagated to `profileStore.bodyAnalysis.current_weight_kg` → `body_analysis` table (the ONE persistence path) |
| Sleep hours | `metrics.sleepHours` | `SleepSession` | Derived from session durations |
| Recent workouts | `metrics.recentWorkouts` | `ExerciseSession` | Read-back of HC exercise sessions |
| Heart rate variability | `metrics.heartRateVariability` | `HeartRateVariabilityRmssd` | RMSSD in ms — recovery indicator (Wave 2) |
| Oxygen saturation | `metrics.oxygenSaturation` | `OxygenSaturation` | SpO2 % (Wave 2) |
| Body fat | `metrics.bodyFat` | `BodyFat` | % from smart scales (Wave 2) |

### I.4 Persistence Status — `health_metrics` Table (IMPLEMENTED, Wave 3)

**Health metrics are persisted to the `health_metrics` Supabase table.** Migration: `supabase/migrations/20260620000003_create_health_metrics.sql`. The runtime store (`healthDataStore.metrics`) remains the SSOT for live UI; `health_metrics` is the persistence + history layer.

#### Schema

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | Default `gen_random_uuid()` |
| `user_id` | uuid (FK → `auth.users.id`) | `ON DELETE CASCADE` |
| `date` | DATE | Local date (not timestamptz) — one row per user per day per metric |
| `metric_type` | TEXT | Enum-like; see values below |
| `value` | NUMERIC | The metric value (units carried by `metric_type` + `unit`) |
| `unit` | TEXT | Display unit, e.g. `"steps"`, `"bpm"`, `"kcal"`, `"kg"`, `"hours"`, `"km"`, `"ms"`, `"%"` |
| `source` | TEXT (default `'healthconnect'`) | `'healthconnect'` (automatic) or `'manual'` (ManualHealthEntryScreen) |
| `recorded_at` | timestamptz | When the reading was taken |
| `created_at` | timestamptz | Default `now()` |

**Constraints:**
- `UNIQUE(user_id, date, metric_type)` — exactly ONE authoritative value per user/day/metric. Writes are upserts: the latest write for a given (user, date, metric_type) wins, regardless of source.
- RLS enabled; SELECT/INSERT/UPDATE/DELETE all gated on `auth.uid() = user_id`.
- Index `idx_health_metrics_user_date` on `(user_id, date DESC)` for history queries.

**`metric_type` values** (matches the metrics surfaced in §I.3):

`'steps'`, `'heart_rate'`, `'resting_heart_rate'`, `'active_calories'`, `'total_calories'`, `'distance_km'`, `'weight_kg'`, `'sleep_hours'`, `'heart_rate_variability'`, `'oxygen_saturation'`, `'body_fat'`

#### `source` column — no-ambiguity guarantee (CLAUDE.md #1)

`source` distinguishes Health-Connect-synced data (`'healthconnect'`) from manually-entered data (`'manual'`) for UI attribution ("from your watch" vs "manually entered"). It does NOT create two sources of truth: the UNIQUE constraint makes the latest value per (user, date, metric_type) authoritative regardless of source. So a manual entry on a day that already has HC data **overrides** that day's HC value for that metric (latest write wins on upsert). This is intentional and documented — it lets users correct bad watch readings. There is no merge, no fallback, no divergence.

#### Service — `healthMetricsDataService`

File: `src/services/healthMetricsData.ts`. Follows the `hydrationData.ts` pattern (thin service over Supabase, errors logged via `console.error`, never swallowed).

| Function | Purpose |
|----------|---------|
| `saveHealthMetric({ userId, date, metricType, value, unit, source })` | Upsert a single metric. Honors the UNIQUE constraint — latest write wins. |
| `saveHealthSnapshot({ userId, date, metrics })` | Bulk upsert of a full day's metrics from a Health Connect sync (one row per metric_type). Called fire-and-forget from `healthDataStore.syncFromHealthConnect`. |
| `getTodayHealthMetrics(userId)` | Today's row(s) for live display. |
| `getHealthMetricsHistory({ userId, metricType, days })` | N-day history for a single metric — feeds charts. |
| `getMultiMetricHistory({ userId, metricTypes, days })` | N-day history for multiple metrics in one call. |
| `deleteHealthMetric({ userId, date, metricType })` | Delete a single day's metric (manual correction UX). |

#### Data flow — automatic (Health Connect) path

```
Smartwatch → Companion app → Android Health Connect
  → healthConnectService.syncHealthData()                  [src/services/health/core.ts]
      → syncAllMetrics(ctx) — per-metric readers            [src/services/health/syncHelpers.ts]
  → healthDataStore.syncFromHealthConnect(result)           [src/stores/healthDataStore.ts]
      → set metrics (Zustand) — UI updates immediately
      → healthMetricsDataService.saveHealthSnapshot({       [src/services/healthMetricsData.ts]
            userId, date: getLocalDateString(), metrics: { steps, heart_rate, ... }
          }).catch(console.error)                          // fire-and-forget
              ↑ persistence failure is logged but does NOT block UI sync
              ↑ does NOT throw back into the store update path
```

Key invariant: **UI sync and persistence are decoupled.** The store write completes and subscribers re-render before the Supabase upsert resolves. If the upsert fails, the error is surfaced via `console.error` (CLAUDE.md #5 — no silent failures) but the user still sees their freshly-synced data.

#### Data flow — manual entry path (Wave 3)

```
WearableConnectionScreen
  → "No Health Connect watch?" → UnsupportedWatchNotice card
  → navigates to ManualHealthEntry route                  [src/screens/settings/ManualHealthEntryScreen.tsx]
      → ManualMetricEntry components (one per metric)      [src/components/health/ManualMetricEntry.tsx]
      → healthMetricsDataService.saveHealthMetric({        [src/services/healthMetricsData.ts]
            userId, date: today, metricType, value, unit, source: 'manual'
          })
      → upsert into health_metrics (UNIQUE wins → overrides any HC value for that day/metric)
```

For Huawei specifically, users can ALSO use the paid "Health Sync" bridge app (Huawei Health → Health Connect) as an alternative to manual entry. Manual entry is the no-cost fallback; Health Sync is the automated-but-paid alternative.

#### Store — `loadHealthMetricsHistory` action

`healthDataStore.loadHealthMetricsHistory(days = 30)` — fetches N days of `health_metrics` rows (all metric_types) via `healthMetricsDataService.getMultiMetricHistory` and populates a new `metricsHistory` state field. Charts subscribe to `metricsHistory` for historical trends. Called on chart-screen mount and after manual entries so the new value renders immediately.

#### `weight` dual-write (unchanged)

`weight_kg` is written to BOTH:
1. `health_metrics` (Wave 3 — daily history, source `'healthconnect'` or `'manual'`)
2. `profileStore.bodyAnalysis.current_weight_kg` → `body_analysis.current_weight_kg` (existing onboarding table — used by the calculation engine for BMR/TDEE/macros)

This is intentional, not a duplication: `body_analysis` is the onboarding SSOT consumed by the calculation engine; `health_metrics` is the time-series history consumed by charts. They serve different consumers.

#### `clearUserData` wipe list (Wave 3)

`clearUserData.ts` now also wipes `health_metrics` for the current user on clear-all (`delete from health_metrics where user_id = <uid>`). Added alongside the existing `analytics_metrics`, `meal_logs`, `water_logs`, etc. wipes.

#### `analytics_metrics` relationship (unchanged)

`analytics_metrics` remains independently accumulated by the analytics engine (not by the HC sync path). It is a separate aggregation layer for streaks, daily summary stats, etc. `health_metrics` is the raw per-metric time-series. The two do not write to each other.

### I.5 Workout Write-Back

Completed FitAI workouts are written back to Health Connect so they appear in Samsung Health / Google Health / any other HC-consuming app, mirroring the iOS `exportWorkoutToHealthKit` path:

```
Workout completion flow (completionTracking.ts)
  → healthConnectService.writeWorkoutSession({ exerciseType, startTime, endTime, title, calories, notes })
      → insertRecords([ExerciseSession record])
      → (if calories > 0) insertRecords([ActiveCaloriesBurned record])
```

Requires `WRITE_EXERCISE` + `WRITE_ACTIVE_CALORIES_BURNED` permissions. Returns `{ success, recordId }`.

### I.6 Background Sync

Foreground sync runs on Home screen mount and via a manual "Sync Now" control. Background sync is also wired:

```
App startup (App.tsx)
  → registerBackgroundHealthSync()                       [src/services/backgroundHealthSync.ts]
      gated on settings.backgroundSyncEnabled
      → expo-background-fetch task: "fitai-healthconnect-background-sync"
      → TaskManager.defineTask → runBackgroundSyncOnce() [src/services/health/core.ts]
          → healthConnectService.shouldSync(1 hour) → syncHealthData(1 day back)
```

Background sync requires `READ_HEALTH_DATA_IN_BACKGROUND` (declared in manifest) and is only honored by Android 15+ (`FEATURE_READ_HEALTH_DATA_IN_BACKGROUND` feature). On older Android versions the task still registers but the OS may not deliver background reads; foreground sync remains the fallback.

### I.7 Permission Model

`disconnect()` now revokes OS-level permissions via `revokeAllPermissions()` (not just a local flag flip) — mirrors `reauthorize()`. Without this, the HC provider app would still show FitAI as having permissions and a background sync could resume reading data.

Runtime flow on cold start:
1. `canUseHealthConnect()` — checks native module loaded AND `getSdkStatus() === SDK_AVAILABLE`. On Android <14 the HC provider app is a separate APK that may not be installed; this check prevents opaque downstream failures.
2. `initializeHealthConnect()` — `getSdkStatus()` → if `SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED`, deep-links user to HC settings; if `SDK_UNAVAILABLE`, prompts install of "Health Connect by Android" from Play Store.
3. `requestPermissions()` — requests the minimal set (see `permissions` array in `core.ts`).
4. `hasPermissions()` — re-validated each launch via `getGrantedPermissions()` (users can revoke from system Settings); falls back to AsyncStorage cache if the SDK check throws.

### I.8 Manifest & Build Configuration

Declared in `android/app/src/main/AndroidManifest.xml` (managed via the `./plugins/withFitAiHealthConnect` Expo config plugin, which wraps `react-native-health-connect/app.plugin` and injects the `HealthConnectPermissionDelegate` into `MainActivity`):

- **READ permissions:** `READ_STEPS`, `READ_HEART_RATE`, `READ_SLEEP`, `READ_EXERCISE`, `READ_ACTIVE_CALORIES_BURNED`, `READ_TOTAL_CALORIES_BURNED`, `READ_WEIGHT`, `READ_BODY_FAT`, `READ_HEART_RATE_VARIABILITY`, `READ_OXYGEN_SATURATION`, `READ_DISTANCE`, `READ_BASAL_METABOLIC_RATE`, `READ_HEALTH_DATA_IN_BACKGROUND` (Android 15+), `READ_HEALTH_DATA_HISTORY`.
- **WRITE permissions:** `WRITE_EXERCISE`, `WRITE_ACTIVE_CALORIES_BURNED`.
- **`<queries>`** for `com.google.android.apps.healthdata` (HC provider app package).
- **`ViewPermissionUsageActivity` activity-alias** with `ACTION_VIEW_PERMISSION_USAGE` + `CATEGORY_HEALTH_PERMISSIONS` — mandatory for Play Store Health Connect approval (Play rejects without it).
- **`minSdkVersion` 26**, `compileSdkVersion` 35, `targetSdkVersion` 34 (set both in `app.config.js` android block and the `expo-build-properties` plugin).

See `src/docs/PLAY_STORE_HEALTH_CONNECT_CHECKLIST.md` for the full Play Store compliance checklist.
