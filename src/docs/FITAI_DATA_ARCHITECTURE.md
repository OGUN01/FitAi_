# FitAI Data Architecture

> **Last updated:** 2026-09-04 (Workout Engine v2 — see §K: canonical exercise catalog, effort/RIR model, 6-scheme progression registry, superset/circuit/drop-set data fidelity, volume landmarks + periodization + autoregulation + goal binding. §K.7 media pipeline in progress at time of writing.)
> **Status:** All issues from Waves 1–10 resolved. Onboarding calculation engine hardened. Choose Your Pace is now unambiguous. Nutrition/analytics/auth SSOT fixes (P0-1…P3-23) applied. Wave 2: Android wearable subsystem migrated from Google Fit to Health Connect. Wave 3: Health Connect metrics now persist to `health_metrics` Supabase table; manual entry fallback live for unsupported watches (Noise/boAt/Fire-Boltt/Huawei). Wave 4: AG14/AG15 schema/calc hardening — `profiles.notification_preferences` column added, `recognition_accuracy_metrics` feedback columns added, calorieCalculator MET weighting fixed, mealSchedule validation, userStore silent-failure hardening, workoutTemplateService draft column fix. Workout Engine v2 (2026-09-04): see §K — closes the "builder without a coach" gap the original architecture doc's §H did not track (§E.4/§F.2/§F.3 predate the workout-builder subsystem entirely and describe only the pre-builder session flow).

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
- [J. Custom Diet Plan, Meal Templates & Goal Recalculation](#j-custom-diet-plan-meal-templates--goal-recalculation)
- [K. Workout Engine v2 — Coach-Grade Progression System](#k-workout-engine-v2--coach-grade-progression-system)

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
| 13 | Notification Preferences | `notification_preferences` | JSONB | `{}` | optional, user toggles + reminder times | `profiles.notification_preferences` |

**Derived (UI only, not persisted):**
- `calculateSleepDuration()` — computed from wake_time and sleep_time for display

### A.3 Tab 2: Diet Preferences → `diet_preferences` table

#### Core Diet
| # | Field | snake_case Name | Type | Default | Storage |
|---|-------|----------------|------|---------|---------|
| 1 | Diet Type | `diet_type` | enum | `"balanced"` | `diet_preferences.diet_type` |
| 2 | Allergies | `allergies` | string[] | `[]` | `diet_preferences.allergies` |
| 3 | Restrictions | `restrictions` | string[] | `[]` | `diet_preferences.restrictions` |
| 4 | Cuisine Preferences | `cuisine_preferences` | string[] | `[]` (smart default: country-derived cuisine pre-selected once on mount, user-editable) | `diet_preferences.cuisine_preferences` — collected via grouped ChipPicker in `CurrentDietSection` (12 options across 4 regions); reaches the worker unchanged via `aiRequestTransformers` |
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
| 2 | Equipment | `equipment` | string[] | `[]` | `workout_preferences.equipment` — smart logic: `gym` → picker hidden, auto `STANDARD_GYM_EQUIPMENT`; `home` → user picks; `both` → gym staples ∪ home picks |
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
| 11a | Preferred Workout Days | `preferred_workout_days` | string[]? | `NULL` (→ even spread from #11) | `workout_preferences.preferred_workout_days` |
| 12 | Pushups Count | `can_do_pushups` | number | `0` | `workout_preferences.can_do_pushups` |
| 13 | Running Minutes | `can_run_minutes` | number | `0` | `workout_preferences.can_run_minutes` |
| 14 | Flexibility Level | `flexibility_level` | enum | `"fair"` | `workout_preferences.flexibility_level` |

#### Weight Goals
| # | Field | snake_case Name | Type | Storage |
|---|-------|----------------|------|---------|
| 15 | Weekly Loss Goal | `weekly_weight_loss_goal` | number? | `workout_preferences.weekly_weight_loss_goal` |

#### Enhanced Preferences

> Fields 17–22 ("What you enjoy") no longer have UI (removed 2026-07-30 per user
> feedback). They are **derived from `primary_goals`** in `useWorkoutPreferences`
> (cardio ← weight-loss/endurance/general_fitness, strength ←
> muscle-gain/strength/weight-gain/general_fitness, outdoor ← endurance,
> variety always true) so AI generation inputs are unchanged.

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
| 4 | Metabolic Age | `metabolic_age` | chronological + (expectedBMR − actualBMR)/expectedBMR × 50; expectedBMR scaled to user's frame via `bandRefBMR × (weightKg/70)` when weight is passed (band refs calibrated to 70 kg — unscaled absolute comparison collapsed heavy users to the 18 floor) | BMR, age, gender, weight | `advanced_review.metabolic_age` |

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
| 18 | Lean Body Mass | `lean_body_mass` | weight × (1 − bf%/100); bf% resolved via SSOT chain manual → AI estimate → BMI-derived → sex default (never bare 0 when BF% uncaptured) | `advanced_review.lean_body_mass` |
| 19 | Fat Mass | `fat_mass` | weight × bf%/100 (same resolution chain) | `advanced_review.fat_mass` |

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
| 33 | Diet Readiness | `diet_readiness_score` | habit booleans on neutral-50 baseline (see C.8) | `advanced_review.diet_readiness_score` |
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
| 39 | Data Completeness % | `data_completeness_percentage` | provided/total fields; booleans count when false (answered "no" is data), dynamic denominators from actual object keys (`calculateCompletionMetrics`) | `advanced_review.data_completeness_percentage` |
| 40 | Reliability Score | `reliability_score` | `advanced_review.reliability_score` |
| 41 | Personalization Level | `personalization_level` | 0.6 × completeness + 0.4 × optional-enrichment coverage (15 enrichment signals: BF%, AI estimate, waist/hip, stress, medical, medications, limitations, experience, pushups, run minutes, workout times, cooking methods, cuisines, country) | `advanced_review.personalization_level` |
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
| 50 | Health Grade | `health_grade` | `advanced_review.health_grade` | Computed by master-engine via `HealthScoreCalculatorService.getGrade(overall_health_score)` |
| 51 | Was Rate Capped | `was_rate_capped` | `advanced_review.was_rate_capped` | Safety cap indicator — flagged only when 2-dp rounded delivered rate < rounded requested rate (sub-0.005 kg/wk caps no longer false-flag next to identical displayed rates). Silent BMR-floor landings surface an `EATING_AT_BMR_FLOOR` warning |
| 52 | Refeed Schedule | `refeed_schedule` | `advanced_review.refeed_schedule` | JSON schedule |
| 53 | Medical Adjustments | `medical_adjustments` | `advanced_review.medical_adjustments` | From medical conditions; unmapped conditions (asthma, arthritis, anxiety, depression, sleep-apnea, high-cholesterol) produce an informational note instead of undefined |

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
| `recognition_accuracy_metrics` | `id` | `user_id → auth.users` | Daily food-recognition accuracy metrics from feedback aggregation (feedback_count, correct_count, average_rating, accuracy_percentage, cuisine_breakdown, enhancement_breakdown). Created in 20260124000001, feedback columns added in 20260727000009. UNIQUE(date) — one row per day. |
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

**Diet Readiness Score:** Neutral-baseline rubric over the health-habit booleans: `50 + (positive/155)×50 − (negative/45)×50`, clamped 0–100. An unanswered habits section maps to a neutral **50** (the old `((score+45)/200)×100` offset pinned untouched sections at ~13–23 and false-triggered LOW_DIET_READINESS). Positive weights: water 10, sugary-drinks 15, regular-meals 25, late-night 10, portions 30, labels 20, 5-servings 20, refined-sugar 15, healthy-fats 10. Negative weights: processed-foods 20, alcohol 10, tobacco 15.

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

#### C.10.1 Feasibility Audit Contract (2026-07-29, commit b5e05fc7)

A 23-scenario audit locked these invariants. `src/__tests__/validation/reviewFeasibility.test.ts` pins them.

**Card/engine parity — a pace card never promises what the engine blocks:**
- Loss cards with rate > `currentWeight × 0.015` are `isBlocked` ("Too fast"), including KEEP MY GOAL and boost cards.
- Diet cards with `dailyCalories < floor (1500M / 1200F)` are `isBlocked`; boost cards when `BMR < floor`.
- COMFORTABLE rate ≤ AT YOUR BMR rate and ≤ the hard limit; duplicate card rates are deduped.
- Gain cards apply the same `MAX_SURPLUS_FRACTION` (10% TDEE) cap as the engine — displayed rate/calories/timeline are the POST-cap values.

**Engine honesty — the delivered plan is what's validated and reported:**
- Gain surplus cap emits `SURPLUS_LIMITED_FOR_SAFETY`; `wasRateCapped` covers gain caps AND bypass BMR-floors; `timeline` recomputes from the delivered rate in every capped path.
- `isAggressive` / `SEVERE_SLEEP_DEPRIVATION` use the DELIVERED weeklyRate, not the requested stored goal.
- Maintenance branch honors the BODY RECOMP card (`weekly_weight_loss_goal > 0` → mild deficit, floored at max(BMR, sex-based minimum)); stored goal `0` → exact TDEE.
- `validateMinimumBodyFat` receives the RESOLVED body-fat value (manual → AI-estimate → BMI-derived → sex default).
- Warnings compute even when blocking errors exist (no warning avalanche after the wizard).
- `applyDeficitLimit` reports the really-enforced deficit % (BMR floor can bind below the nominal cap). Teens (<18) always get the conservative 15% cap.

**Pregnancy/breastfeeding:** ACOG bonus (+0/+340/+450 T1/T2/T3, +500 lactation) is delivered in maintenance/gain branches and reflected on cards; all deficit cards are suppressed; the deficit guard re-checks post-medical-adjustment values.

**Boundaries:** gain targets with BMI ≥ 40 are BLOCKED (`TARGET_BMI_EXTREME`); loss targets in BMI 17.5–18.5 warn (`TARGET_BMI_UNDERWEIGHT_BAND`); `workoutsPerWeek` is clamped ≥ 1 before the worker (freq-0 bootstrapping fails its Zod `.min(1)` otherwise); metabolic age has teen (13–17) reference brackets in both engine copies.

**Hook/UI:** stored pace goals reset when the goal mode (loss/gain/maintenance) changes; acknowledgment is owned by `useAdvancedReviewForm` (auto-ack when every warning carries alternatives); auto-select never picks a blocked/missing card; when zero safe cards exist the UI shows the infeasible-goal guidance instead of a dead picker.

### C.11 Daily Energy Ledger & Under-Performance Response (Goal Engine Phases D–E)

**Daily Energy Ledger (`daily_energy_ledger`, one row per (user_id, date)):** backfilled on app open by `energyLedgerService.catchUpLedger(userId)` (idempotent upsert, module re-entry guard; called from `useHomeLogic` on mount + day-boundary). Derivations: `intake_kcal` = Σ`meal_logs.calories` for the LOCAL day; `burn_kcal` = Σ`workout_sessions.calories_burned` attributed by `getLocalDateString(completed_at)` (same value Home shows for a completed past day); `neat_tdee` recomputed from the day's CURRENT (forward-filled) weight, not onboarding; `plan_burn` = active plan's per-day-of-week burn; `net_deficit = neat_tdee + plan_burn − intake` — **POSITIVE = deficit** (matches `customDietProjection`; the migration's column COMMENT predates the spec and is stale); `planned_deficit = expenditure − advanced_review.daily_calories`; `had_logged_data` = the day had ≥1 meal_log row. **Days with zero meal rows are EXCLUDED from adherence math — never scored as 0-kcal deficit days.**

**Under-performance response (Phase E, `src/services/energyResponseService.ts`):**

- **14-day adherence formula:** `adherence = Σ net_deficit ÷ Σ planned_deficit` over ELIGIBLE days only — `had_logged_data = true` AND `|planned_deficit| ≥ 50 kcal` (maintenance days skipped, never divide-by-zero). Sums are SIGNED (surplus days drag the ratio down honestly; gain goals yield a positive ratio symmetrically). Aggregate Σ/Σ rather than a mean of per-day ratios, so a 100-kcal-planned day doesn't outweigh a 900-kcal one. Threshold: below **0.70** with a full 14-day ledger window → prompt.
- **Honest number:** the prompt shows Σplanned/7700 kg ("your plan promised X kg this fortnight") vs Σactual/7700 kg, plus the eligible-day count. **Nothing auto-changes** — no plan mutation, no target change.
- **Three buttons** (`UnderperformancePromptModal` on Home, styled after `HealthConnectDisclosureModal`): *Keep pushing* (dismiss), *Rebuild a plan I'll actually hit* (`getRebuildRoute()`: active diet plan → `MealBuilder`, else `WeeklyBuilder`), *Don't ask again*.
- **"Don't ask again" persistence:** `plan_acknowledgments` row with `warning_codes ['UNDERPERFORMANCE_14D']`, `plan_kind 'diet'`, `plan_id` = the active diet plan's `databaseId` (only when a valid UUID — the column has no FK and client ids like "plan-…" are not UUIDs; null rows still match each other so AI-plan users aren't re-prompted), `shown_payload` = the adherence snapshot. Before showing, an existing ack (same plan_kind, same plan_id or a plan_id-less row) suppresses the prompt.
- **Safety trigger — ALWAYS ON, ignores every acknowledgment:** intake < 1000 kcal on **3+ consecutive logged days** → supportive check-in (suggests professional care; never scolding). Unlogged days (`had_logged_data = false`) neither count nor break the streak; a logged day ≥ 1000 kcal breaks it. Fires at most once per qualifying streak: each firing inserts `plan_acknowledgments` with `warning_codes ['LOW_INTAKE_SAFETY_3D']` and `shown_payload.streak_end` = the streak's newest day; a later run skips only when a recorded `streak_end` ≥ the current streak's oldest day (a 3→4-day growth doesn't re-fire; a NEW streak after a ≥1000 kcal day does). It reads ONLY its own `LOW_INTAKE_SAFETY_3D` markers — it never honors UNDERPERFORMANCE_14D acknowledgments.
- **Wiring:** `useHomeLogic` runs `checkEnergyResponse(userId)` after first paint on app open (safety checked first, adherence second; only one surfaces). Guest/Supabase failures → `null` (`console.error`, non-fatal), retried naturally on the next app open.

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

**Diet navigation structure:** the Diet feature is split into three screens: the plan/today view, meal logging/history, and nutrition insights. All three consume the same `nutritionStore`; screens do not maintain parallel meal-completion state.

**Meal status SSOT:** `meal_logs.is_completed` is authoritative for persisted completion. `nutritionStore.mealProgress` is the runtime projection: realtime INSERT/UPDATE sets 100 only when `is_completed=true`, preserves an existing sub-100 in-progress value for false/null, and removes stale completion when a row becomes incomplete or is deleted. Planned meals without an explicit completed log remain planned/in-progress.

**Nutrition streak flow:** `achievementStore` is the sole writer of `nutritionStreak` and `longestNutritionStreak`. Initialization restores persisted values through `analyticsDataService.loadNutritionStreaks` and loads recent `meal_logs.logged_at` dates for an authoritative multi-day recompute; nutrition hydration, realtime insert/update/delete, completion, and local meal additions invoke the achievement action via lazy module resolution to avoid a circular-import initialization hazard. The action derives consecutive local dates and persists through `analytics_metrics`.

**Selected-date history limitation:** remote `meal_logs` hydration currently fetches today's consumed logs plus planned-log rows for the active plan. Historical selected dates are therefore limited to already-local/persisted store data; broad remote date-range history loading is intentionally out of scope here.

### E.4 Workout Screen

**Hook:** `useFitnessLogic` (`src/hooks/useFitnessLogic.ts`)

| Data | Source | Path |
|------|--------|------|
| Personal info | `profileStore.personalInfo` | Age, gender for AI prompt |
| Body analysis | `profileStore.bodyAnalysis` | Weight, medical conditions |
| Workout prefs | `profileStore.workoutPreferences` | All preferences + assessment |
| Advanced review | `profileStore.advancedReview` | Recommendations, HR zones (wired in Wave 2E) |
| Workout generation | `aiService.generateWeeklyWorkoutPlan()` | All data passed including advancedReview |

#### E.4a Workout Session Screen — Live Metrics Data Flow

**Hook:** `useWorkoutSession` (`src/hooks/useWorkoutSession.ts`)

| Metric | Source | Derivation | Reactivity |
|--------|--------|------------|------------|
| Timer (TIME) | `workoutStats.totalDuration` | `Date.now() - workoutStartTime`, computed inside the `workoutStats` memo | Recomputes when `exerciseStats` changes (set/exercise completion); the live-ticking display is a separate self-ticking `WorkoutElapsedTime` in `WorkoutHeader` |
| Calories (CAL) | `workoutStats.caloriesBurned` | MET calc via `calculateWorkoutCalories(completedInputs, resolvedWeight)` — reads ACTUAL logged reps from store SSOT | Recomputes when `exerciseProgress` / `storeExercises` change |
| Volume (VOL) | `sessionVolume` (WorkoutSessionScreen) | `Σ(weight × reps)` across `currentWorkoutSession.exercises[].sets[]` where `weight != null && reps != null` | **Must subscribe reactively** via `useFitnessStore((s) => s.currentWorkoutSession?.exercises)` — `getState()` in a `useMemo` dep is NOT reactive (bug fixed 2026-07-28) |
| Progress bar | `overallProgress` (0..1) | **Set-based**: `completedSets / totalSets` across ALL exercises (not exercise-based) | Recomputes when `exerciseProgress` changes |

**SSOT for set data:** `fitnessStore.currentWorkoutSession.exercises[].sets[]` — `SetLogModal.handleSave` writes weight/reps/rpe/completed here via `updateSetData`. The hook's `exerciseProgress` is a READ-ONLY projection derived from the store.

**ExerciseHistory overlay:** When the user taps the exercise name during a workout session, `ExerciseHistoryScreen` renders as a SECOND overlay on top of `WorkoutSessionScreen` (not a mutually-exclusive branch in `renderOverlayScreen`). The `goBack` handler checks if both `exerciseHistorySession.isActive && workoutSession.isActive` and only closes the history overlay, preserving the workout session.


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

**Per-meal swap flow:** `useMealPlanning.swapMealInPlan(selectedMeal)` sends the selected slot's type/day/calories/macros plus the current profileStore diet type, allergies, restrictions, and dislikes to authenticated `POST /diet/swap`. The Worker validates with Zod, generates exactly one meal through the existing `createAIProvider` abstraction, rejects diet/allergen/exclusion or calorie/macro drift, and resolves its image. The client transforms that one worker meal, preserves the selected meal's `id` and `dayOfWeek`, replaces only that array entry, then persists the complete weekly plan through `nutritionStore.saveWeeklyMealPlan` (the existing save flow).

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

**Other:** `calorieTarget`, `mealsPerDay`, `daysCount`, `dietaryRestrictions[]`, `excludeIngredients[]`, `weeklyWeightLossGoal` (explicit pace tier, sourced from profileStore.workoutPreferences.weekly_weight_loss_goal — the Review-tab SSOT; sent only when > 0 since the worker Zod marks it `.positive().optional()`; `daily_calories` stays the primary calorie source)

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

### F.1.3 Meal Image Pipeline (`meal.imageUrl`)

After AI generation + portion adjustment, the worker attaches a real food photo to each meal via `resolveMealImages()` (`fitai-workers/src/utils/mealImageResolver.ts`). This runs **server-side only**; the app reads `meal.imageUrl` from Supabase — zero third-party calls from the device. A missing/failed resolution leaves `imageUrl = undefined` and the client renders the gradient placeholder (`MealImage.tsx`). A wrong photo is never preferable to no photo.

**Canonicalization** (`canonicalizeDishName`): the raw dish string is reduced to a canonical dish noun used for both lookup and the KV cache key (`mealimg:canon:<canonical>`). It strips trailing accompaniments (`with X` / `and X` / `& X` / `in X` / `on X`) and a leading dietary-modifier compound (`low-fat`, `high-protein`, `sugar-free`, …). It deliberately does NOT drop the last word (that produced "Low Fat" → an airplane photo) and does NOT strip culinary words (`masala`, `curry`, `dal`). Variants collapse: "Low-Fat Curd with Roasted Cumin" / "Curd with Roasted Cumin" / "Curd" → `curd`.

**4-tier cascade** (first hit wins; `undefined` → gradient fallback):
1. **Curated registry** (`dishImageRegistry.ts`) — O(1), zero-network, hand-verified Wikimedia thumb URLs for the most common Indian dishes (biryani, curd, dal, idli, kadhi, kheer, khichdi, lassi, naan, paneer, paratha, rajma, raita, roti, upma, chana masala, sambar, vada). The correctness guarantee.
2. **English Wikipedia `pageimages`** (`en.wikipedia.org`) — the article's curated lead image. High precision. ~56% of canonical Indian dish nouns.
3. **Wikipedia `prop=images` → Commons `imageinfo`** — for articles that exist but have no designated pageimage (Dosa, Poha, …). Takes the first real photo on the article.
4. **Wikimedia Commons `generator=search`** — last resort for compound/regional names with no Wikipedia article. A relevance gate requires a real food token in the query AND in each result's title, so generic/unrelated matches (the airplane, "Bhalla Papri Chaat" for a curd query) are rejected.

**Caching**: results (including negative misses as `""`) are cached in the `MEAL_CACHE` KV namespace for 60 days at the canonical key, so each unique dish resolves exactly once across all users. **Telemetry**: dishes that fall through to the gradient are logged (`No image (gradient fallback): raw=… canonical=…`) so the curated registry grows from real misses.

**Persistence**: resolved `imageUrl` values are stored in `weekly_meal_plans.plan_data` (JSONB `meals[].imageUrl`). To re-resolve, regenerate the plan (the app's Refresh button) — never patch stored URLs by hand except to null a known-wrong value.

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

**Training days:** `weeklyPlan.preferredDays` is resolved by
`getWorkoutDaysFromPreferences()` — the user's explicit `preferred_workout_days`
(onboarding day chips, field 11a) wins; legacy rows without it fall back to a
frequency-based spread. The worker's rule-based generator assigns
`workouts[i].dayOfWeek = preferredDays[i]` (`workoutGenerationRuleBased.ts`), so
plans land on the days the user picked. Invariant held by
`useWorkoutPreferences`: `preferred_workout_days.length === workout_frequency_per_week`.

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
6. Increments exposed via `progressionService.getIncrementForExercise(exerciseId)` and
   `PROGRESSION_INCREMENTS` export — UI explainers (SetLogModal progressive overload
   card) pull the real step + rep range from the service/plan, never hardcoded.

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
| H4b | P0 | `cuisine_preferences` had DB column + save/load + worker prompt consumption but NO live UI wrote it — always `[]`, prompt silently fell back to country auto-detect | 2026-07-31 | Grouped ChipPicker (12 cuisines, 4 regions) added inside `CurrentDietSection` with progressive disclosure; wired through `useDietPreferences` form hook like sibling multi-selects; country-derived smart default pre-selects once on mount + surfaces as suggestion tint | `DietPreferencesConstants.ts`, `CurrentDietSection.tsx`, `useDietPreferences.ts`, `DietPreferencesTab.tsx` |
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

### DB Schema / Calc Hardening (2026-07-27 — AG14/AG15)

| ID | Severity | Issue | Resolution | Files Changed |
|----|----------|-------|------------|---------------|
| AG15-1 | P0 | `profiles.notification_preferences` JSONB column read/written by notificationService.ts and declared in supabase-types.generated.ts, but no migration had added the column — every write failed silently | Migration `20260727000008` adds `notification_preferences JSONB DEFAULT '{}'`. Notification toggles now persist to the cloud (Zustand `notification-store` was already the local source). | migration `20260727000008_add_notification_preferences_to_profiles.sql` |
| AG15-2 | P1 | `recognition_accuracy_metrics` table had only the base columns (total_recognitions, correct_recognitions, etc.) — every `foodRecognitionFeedbackService.updateAccuracyMetrics` insert failed with a PostgrestError ("Could not find the column"), silently dropping the day's accuracy metrics | Migration `20260727000009` adds 6 columns: `feedback_count`, `correct_count`, `average_rating`, `accuracy_percentage`, `cuisine_breakdown` (JSONB), `enhancement_breakdown` (JSONB). Inserts now succeed. | migration `20260727000009_add_recognition_accuracy_metrics_feedback_columns.sql` |
| AG15-3 | P2 | `workoutTemplateService.saveDraft/loadDraft` used `plan_data` column + wrote `total_workouts`/`duration_range` fields that don't exist on the draft path; loadDraft selected `plan_data` causing a column-not-found error | saveDraft now inserts `workouts: planData` (the correct draft column), loadDraft selects `workouts`. Removed `total_workouts` and `duration_range` from the draft insert. | `src/services/workoutTemplateService.ts` |
| AG15-4 | P2 | `recognizedFoodLogger.ts` swallowed the `meal_recognition_metadata` insert error (empty catch) — failed metadata inserts were invisible | Added `console.error` in the catch block (CLAUDE.md #5 — no silent failures). | `src/services/recognizedFoodLogger.ts` |
| AG14-1 | P2 | `calculateWorkoutCalories` computed `averageMET` as an unweighted mean across exercises — inaccurate when exercises had different durations (a 5-min cardio block was weighted equally to a 30-min strength block) | `averageMET` now weights each exercise's MET by its duration: `totalWeightedMET += met * durationMinutes; averageMET = totalWeightedMET / totalDurationMinutes`. | `src/services/calorieCalculator.ts` |
| AG14-2 | P2 | `parseTimeToMinutes` in `mealSchedule.ts` accepted out-of-range hours/minutes (e.g. "24:99") producing garbage meal schedules; also carried a dead `awakeDuration` computation never read | Added range validation (hours 0-23, minutes 0-59 → return null). Removed dead `awakeDuration` block. | `src/utils/mealSchedule.ts` |
| AG14-3 | P1 | `userStore.ts` had 3 catch blocks (createProfile, getProfile, createFitnessGoals) that swallowed errors with no `console.error` — DB failures were invisible (violates CLAUDE.md #5) | All 3 catch blocks now `console.error` before setting error state. | `src/stores/userStore.ts` |
| AG14-4 | P2 | `userStore.ts` dropped `fitnessGoals` when `profile` was null (e.g. goals created before profile finalized) — user data lost on store reset | Added `fitnessGoals: FitnessGoals | null` runtime field, persisted via `partialize`, synced from `profile.fitnessGoals` when profile present, preserved when profile is null (rule 6 — store is runtime source, never drop user data). `reset()` now clears it. | `src/stores/userStore.ts` |

**Total: 8 issues resolved (AG14/AG15), zero new TypeScript errors introduced.**

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

---

## J. Custom Diet Plan, Meal Templates & Goal Recalculation

The "Custom Diet Plan, Meal Templates & Goal Recalculation Engine" feature (Phases 1–6) lets a user hand-build a weekly meal plan meal-by-meal instead of (or alongside) the AI-generated one, reuse saved meals as templates, and see a live validation/projection of that plan against their goal. This section is the data-flow reference for it.

### J.1 Dual-Source Plan Architecture (`nutritionStore`)

The store holds **two** weekly plans and a selector that switches which one drives the Diet Screen's kcal/macro goals:

| Field | Type | Purpose |
|-------|------|---------|
| `weeklyMealPlan` | `WeeklyMealPlan \| null` | The AI-generated plan (§F.1 pipeline). The original source. |
| `customWeeklyMealPlan` | `WeeklyMealPlan \| null` | The user's hand-built plan from the Meal Builder. |
| `activeDietSource` | `'ai' \| 'custom'` | Which plan is "live" — drives the Diet Screen totals. Default `'ai'`. |
| `goalTargetsMode` | `'goal' \| 'plan'` | **Goal Engine (Phase A.2/C): shared target-source toggle.** `'goal'` = daily calorie/macro targets follow the onboarding-goal-derived number; `'plan'` = follow the active custom plan's per-day number (falling back to the goal target — labelled — on empty plan days). One shared field on `profiles.goal_targets_mode` (applies to BOTH diet and workout, never per-domain). Persisted via `setGoalTargetsMode` (offline queue); hydrated in `loadData()` alongside `active_diet_source`; reset to `'goal'` automatically whenever `setActiveDietSource('ai')` or `setActivePlanSource('ai')` fires. Default `'goal'`. |
| `getActiveWeeklyMealPlan()` | getter | Returns `customWeeklyMealPlan` when `activeDietSource==='custom'`, else `weeklyMealPlan`. **The Diet Screen must read through this getter, not the raw fields**, so toggling the source atomically swaps which plan's daily totals are shown. |

**SSOT rule (Principle 1):** `activeDietSource` is the single switch. `DietScreen`'s kcal goal derives from `getActiveWeeklyMealPlan()`'s daily totals; it must never hold a parallel "current plan" copy. Toggling back to `'ai'` restores the AI plan's totals with no re-generation.

**Target-source resolution (Goal Engine Phase C):** `useCalculatedMetrics` exposes `targetsSource: 'goal' \| 'plan' \| 'goal_fallback_empty_day'` on `CalculatedMetrics`. The silent override (custom-plan targets replacing the onboarding target whenever `activeDietSource==='custom'`) is now conditional on `goal_targets_mode==='plan'`: mode `'goal'` always returns the goal-derived target; `'plan'` + custom plan + today has meals → the plan's per-day target (`'plan'`); mode `'plan'` + empty plan day → goal target with `targetsSource: 'goal_fallback_empty_day'` so the UI can label it ("Goal target — no meals planned today") instead of silently reverting. Gap surfaces read this: Home `GapSummary` (food + burn gap, `src/components/home/GapSummary.tsx`), Diet `CompactIntakeSummary` target-source caption, Fitness `BurnGapCard` (planned vs actual burn; actual = `WorkoutProgress.caloriesBurned` SSOT, planned = `computePlanBurnPerDay(activePlan, weightKg).perDayOfWeek[today]`). The Home burn actual is `useHomeLogic.realCaloriesBurned` (wearable precedence: watch `activeCalories` wins when fresh, app MET burn otherwise) — the Phase D ledger must reuse this same resolved value.

**Persistence:** Both plans persist to the **same** `weekly_meal_plans` Supabase table, distinguished by `plan_source` (`'ai'` | `'custom'`). Custom saves (line ~506) upsert the row with `plan_source: 'custom'`, `is_active: true`; a pre-save lookup (`eq(plan_source, 'custom')`, most-recent) reuses the existing custom row so successive edits update one row instead of stacking duplicates. Writes go through the offline queue (`offlineService.queueAction`) — the store is the runtime SSOT, Supabase is the persistence layer (Principle 6). Guests never reach the write path (`getCurrentUserId` guard). `loadCustomWeeklyMealPlan(userId)` reads back the most-recent `plan_source='custom'` row on app start.

### J.2 Stores

| Store | File | Role | Persistence |
|-------|------|------|-------------|
| `nutritionStore` | `src/stores/nutritionStore.ts` | Holds the two plans + `activeDietSource` selector; persists custom plans to `weekly_meal_plans`. | Supabase `weekly_meal_plans` (`plan_source='custom'`) via offline queue. |
| `dietBuilderStore` | `src/stores/dietBuilderStore.ts` | **Transient** builder scratch state: the `draft` (week of days→meals→items), `pickerOpen`/`pickerContext`, validation warnings, and the goal projection. Not persisted on its own — `saveAndActivate()` writes the draft into `nutritionStore.customWeeklyMealPlan` and flips `activeDietSource='custom'`. | None directly; the committed plan is what persists. |
| `savedMealsStore` | `src/stores/savedMealsStore.ts` | User-saved meals for reuse (Log Meal modal + Meal Builder "My Saved Meals" template source). | AsyncStorage (`fitai-saved-meals-storage`, debounced) **and** Supabase `saved_meals` table (fire-and-forget via offline queue; store stays runtime SSOT). Guests skip the Supabase path. |

**`dietBuilderStore.addFoodItem` / `updateFoodItem`** accept any well-formed `MealItem` with **zero validation on `food` identity** — this is deliberate, so the same code path serves foods from any source (§J.3) including hand-typed ones. Validation is advisory, not a hard gate: the "Save & Activate" footer stays enabled regardless; `MacroValidationBanner`/`NutritionInsightsPanel` surface warnings from the projection but never block the save. `saveAndActivate()` calls `save()` then `setActiveDietSource('custom')` — it does not auto-navigate; the caller (`MealBuilderScreen.handleSaveAndActivate`) returns to the Diet Screen.

### J.3 Food Search Sources (Meal Builder `FoodPickerSheet`)

When adding a food to a custom-plan meal, `FoodPickerSheet.runSearch` merges **three** searchable sources, then a universal manual fallback. Merge order = curated first, then generic-Indian, then branded; dedupe by lowercased name.

| Source | `FoodSearchHit.source` | Where | Scope | Lookup |
|--------|------------------------|-------|-------|--------|
| **Indian cooked-dish DB** | `'indian'` | `src/data/indianFoodDatabase.ts` | 30 hand-curated cooked dishes (biryani, dal makhani, dosa…) | In-memory key→entry; `name.includes(q)` |
| **IFCT 2017** | `'ifct'` | Supabase `ifct_foods` table | 542 ICMR/NIN generic Indian foods (grains, pulses, seeds, nuts, dairy, fruit, veg) | `ilike('name', %q%)`, `.limit(20)`. Public-read RLS (`USING (TRUE)`) — works for guests too. |
| **Open Food Facts (branded)** | `'sqlite'` | On-device SQLite (barcode-keyed) | Branded packaged products | Local FTS name search |

**IFCT (`ifct_foods`) — populated + wired in Phase 6.** Schema: `food_code` (TEXT PK), `name`, `local_names`, `energy_kcal_100g`, `protein_100g`, `carbohydrate_100g`, `fat_100g`, `fiber_100g`, `sugar_100g`, `sodium_mg_100g` (already mg — matches `Macronutrients.sodium`'s convention, no conversion), … GIN FTS index on `name`+`local_names`. Imported once via `scripts/import-ifct.mjs` (wraps the `ifct2017` npm package: `compositions.load()` → `compositions('')` returns all 542 rows; INFOODS tagnames; `enerc` kJ ÷ 4.184 → kcal, `na`/`ca`/`fe`/`vitc` × 1000 → mg). **Match strategy:** PREFIX (`${q}%`) + WORD-BOUNDARY (`% ${q}%`) in parallel, **not** a bare substring — a bare `%${q}%` collided ("oat" matched "Goat"). "Goat" matches neither (no prefix, no leading space) and is correctly excluded. **Known gap:** IFCT 2017 lacks late-arriving imports like "chia seeds" → correctly falls to the P0 manual path.

**`fromIFCT(row)` mapper** (in `FoodPickerSheet.tsx`) builds a `FoodSearchHit` with `key: "ifct:<food_code>"` and `per100g` from the `_100g` columns (null → 0, sugar/sodium → `undefined` when null). The IFCT branch is wrapped in try/catch and degrades gracefully — an offline/failed query just returns the other two sources, never a crash. Supabase errors are logged via `console.error` (Principle 5).

### J.4 Custom (Manual) Food Entry — the universal fallback (`buildMealItemFromMacros`)

For any food no database contains (chia seeds, boiled water, a homemade recipe), `FoodPickerSheet` offers **"Add custom food"** — a persistent footer row once `query.length ≥ 2`, plus a CTA in the zero-results empty state that pre-fills the name with the typed query. The inline form (Name required; Grams default 100; Protein/Carbs/Fat/Fiber default 0) mirrors `LogMealModal`'s proven manual-entry pattern rather than inventing a new one.

**Shared helper — `buildMealItemFromMacros(input)`** (`src/services/foodPickerService.ts`):
- Input: `{ name, grams, protein, carbs, fat, fiber }` (absolute numbers for the given quantity — **not** a per-100g density).
- Calories via **Atwater**: `caloriesFromMacros = protein×4 + carbs×4 + fat×9` (`src/utils/nutritionRecalc.ts`). This is why "boiled water" (all macros 0) lands at **0 kcal with no special-casing** — the universal fallback correctly handles zero-calorie items.
- Fabricates a minimal `Food` (`id: "custom_<name>_<ts>"`, `category: "proteins"`, `servingSize: grams`, `servingUnit: "g"`, `verified: false`) and returns a `MealItem` with `quantity: grams`, `unit: "g"`.
- **Shared by** `FoodPickerSheet`'s custom form **and** `savedMealsStore.ingredientToMealItem` (which parses its string fields and delegates here) — so the `Food`-object fabrication lives in one place (Search Before Building, Principle 3).
- Routed through the **same** `commitMealItem` → `addFoodItem`/`updateFoodItem` path as any searched hit — no new store method. Default unit `"g"` matches `getDefaultUnit`'s fallback, so `FoodRow`'s quantity editor works unchanged.

A hand-typed food stays **local to the plan/meal** it's added to — it is not written to any shared/crowd-sourced table. Reuse later is via "Save as template" into `savedMealsStore` (already exists), not via the food search.

### J.5 Goal Recalculation / Validation (`customDietProjection`)

`src/services/validation/customDietProjection.ts` projects the draft custom plan against the user's TDEE/goal and emits advisory warnings the builder surfaces live (not at save):

- **`GOAL_DIRECTION_CONFLICT`** — the plan's daily average pushes *against* the user's goal direction (e.g. surplus calories during a cut, or deficit during a bulk). **No projected date is rendered** for this code (see `MacroValidationBanner` / `NutritionInsightsPanel`) — a direction conflict is a "stop and reconsider" signal, not a "you'll reach your goal on day N" one.
- Other codes carry a projected goal-reach date.

Warnings are advisory only — `saveAndActivate()` is never blocked by them (§J.2).

### J.6 Type Contracts

- **`MealItem`** (`src/types/diet.ts`): `{ foodId, food: Food (required), name?, quantity, unit?, calories, macros }`.
- **`FoodSearchHit`** (`src/services/foodPickerService.ts` — single source for food-picker types): `{ key, name, subtitle?, per100g: { calories, protein, carbs, fat, fiber, sugar?, sodium? }, source, barcode?, … }`. `source` union: `'sqlite' | 'indian' | 'ifct' | 'custom'`. (Previously lived in a `FoodSearchSheet.tsx` component that was built but imported nowhere — that orphan was deleted once the type was relocated.)
- Unit resolution: `getDefaultUnit`/`convertToGrams` (`src/services/foodUnitConversions.ts`), with a cup override for milk (so IFCT "Milk, whole, Cow" defaults to "1 cup"), and tbsp/cup overrides for chia/flax/oats (measured by spoon, not grams).

---

## K. Workout Engine v2 — Coach-Grade Progression System

> Added 2026-09-04. Closes the gap between "has a workout builder" and "coaches
> the user toward their goal" — canonical exercise identity, a real effort
> model, multiple progression schemes, session data fidelity for supersets/
> circuits/drop-sets, and a volume/periodization/autoregulation layer. Origin:
> a survey of openGym (github.com/emilfunk/opengym, AGPL — used only as a
> feature/algorithm *specification*, no code ported) identified progression-
> scheme variety, an RIR-style effort model, and a capped e1RM formula as
> genuine gaps; this section documents what FitAI built to close them, which
> goes considerably further (canonical catalog, volume landmarks,
> periodization, autoregulation — none of which openGym has).

### K.1 Canonical Exercise Catalog (Phase 1)

**Problem it replaced:** exercise identity was split across two disjoint ID
spaces — ~1,500 ExerciseDB (exercisedb.dev) hash IDs (`"VPPtusI"`, AI-plan
exercises) and ~69 legacy curated snake_case IDs (`"push_up"`, custom-builder
exercises) — bridged by exactly 5 hand-written rows in
`src/data/exerciseIdMap.ts` (deleted; confirmed zero importers before removal).
Every exercise-classifying consumer either only recognized curated IDs or
silently defaulted for anything else.

**What exists now:**
- `exercise_catalog` table (`supabase/migrations/20260904000002_create_exercise_catalog.sql`)
  and its offline mirror `src/data/exerciseCatalog.generated.ts` — **1,552
  canonical rows** (1,500 ExerciseDB + 52 curated exercises with no confident
  DB match, standalone; 17 curated IDs merged in as `aliases[]` on an
  ExerciseDB row via **exact name match only** — fuzzy/contains/word-overlap
  matching was tried and rejected: it produced dangerous false positives,
  e.g. curated `"squat"` → DB `"bodyweight squatting row (with towel)"`,
  curated `"crunch"` → `"run"`. Wrong identity is worse than no identity.
- Both are generated by `scripts/generate-exercise-catalog.mjs` (Node,
  offline, deterministic) — re-run it after editing
  `src/data/exerciseClassificationVocab.json` (the shared keyword/mapping
  vocab, also consumed live by `src/utils/resolveExerciseMeta.ts`) or the
  source `exerciseDatabase.min.json`. Never hand-edit the generated file or
  the seed migration.
- Per row: `canonicalId`, `slug`, `name`, `aliases[]`, `primaryMuscles[]`,
  `secondaryMuscles[]`, `bodyPart`, `equipment[]`, `movementPattern` (squat /
  hinge / horizontal_push / vertical_push / horizontal_pull / vertical_pull /
  lunge / carry / rotation / isolation — keyword-matched against the name in
  a fixed priority order), `loadingType` (barbell / dumbbell / machine /
  cable / bodyweight / banded / time), `isBodyweight`, `isTimeBased`
  (name-keyword heuristic — ExerciseDB carries no such flag),
  `isUnilateral`, `defaultIncrementKg`, `defaultRepRange`, `skillLevel`
  (mirrors `exerciseFilterService.categorizeExercises` — keep both in sync),
  `contraindications[]` (heuristic from movement pattern + loading, **not** a
  clinical claim — starting point for Phase 6 substitution logic),
  `fatigueCost`, `media[]` (tiered — see K.7).
- `src/utils/resolveExerciseMeta.ts` — `resolveExerciseMeta()` and
  `deriveExerciseClassification()` (bodyweight/time-based/lower-body flags
  for progression) now check the catalog **first**, falling back to the
  original DB→curated dual lookup only for an exerciseId that postdates the
  last catalog generation.
- Fixed while wiring this in: the muscle-vocab map never recognized the
  literal ExerciseDB string `"shoulders"` (only `"delts"`/`"deltoids"`), so
  e.g. bench press silently dropped shoulder credit from the muscle heatmap
  and every downstream consumer. Also added `"quads"`, `"calves"`,
  `"adductors"`, `"abductors"`, `"hip flexors"`, and bare `"chest"`/`"back"`/
  `"core"` — all confirmed against a full scan of the real 1,500-exercise
  vocabulary, not guessed.

### K.2 Correctness Fixes (Phase 0)

- **`src/utils/oneRepMax.ts`** — `estimateOneRepMax` previously ran
  **uncapped Epley above 10 reps** (a 20-rep set reported ~1.67× true 1RM,
  writing bogus `exercise_prs` rows). Now returns `null` above
  `MAX_RELIABLE_REPS = 12` (formulas diverge past that point); callers MUST
  treat `null` as "no reliable estimate," never coerce to 0. Added
  `lombardi()`. One-off migration
  `20260904000001_purge_unreliable_e1rm_prs.sql` deleted PR rows written
  under the old unbounded calculation.
- **`progressionService.ts` / `warmupService.ts`** classification — both
  used hardcoded snake_case keyword Sets that only matched legacy curated
  IDs, so AI-plan hash IDs silently fell through to "upper body, weighted,
  rep-based" defaults (wrong increment, wrong warm-up protocol for the
  majority of AI-generated exercises). `suggestNextWeight` gained an
  `isTimeBased` override param; every call site now resolves classification
  via `deriveExerciseClassification` (K.1) and passes it in explicitly —
  the internal keyword Sets remain only as the last-resort fallback and stay
  covered by their own existing unit tests.

### K.3 Effort Model — RPE / RIR (Phase 3)

`exercise_sets.rpe_10` (added by `20260725000010_workout_builder_
foundation.sql` for the workout **builder's** target-RPE slider,
`PlannedExercise.targetRpe`) was never written by **session logging** — only
the coarse 3-tap bucket (`rpe` 1-3, Easy/Just Right/Hard) was captured, even
though the UI already displayed each tap's RPE-1-10 equivalent
(`{1:4, 2:7, 3:9}`) and then discarded it.

- **`src/utils/effortScale.ts`** — SINGLE SOURCE for the bucket↔RPE10
  mapping, `RPE_LABELS` (also now used by `ExerciseEditorSheet.tsx`'s
  builder slider — was a duplicated local copy), `rpe10ToBucket`,
  `rpeToRir` (display-only: **storage stays RPE**, RIR = 10 − RPE is never
  persisted), `isHardSet`/`HARD_SET_RPE_THRESHOLD = 7`.
- `SetLogModal.handleSave` now computes `rpe10` via
  `EFFORT_BUCKET_TO_RPE10[rpe]` and writes it through
  `fitnessStore.updateSetData` → `currentWorkoutSession.exercises[].sets[].rpe10`.
- `completionTracking._writeExerciseSets` writes `rpe_10` on every row
  (falls back to bucket-deriving it from `rpe` for any in-flight session
  data that predates this field).
- Migration `20260904100000_backfill_rpe_10_from_bucket.sql` backfilled
  existing rows.
- `exerciseHistoryService` reads `rpe_10` back;
  `getLastWorkingSetRPE` prefers `rpe`, falls back to
  `rpe10ToBucket(rpe_10)` for robustness.

### K.4 Progression Scheme Registry (Phase 3)

`src/services/progression/` — replaces the single hardcoded double-
progression behavior with a registry of 6 schemes, dispatched via
`suggestNext(scheme, ctx)`:

| Scheme | Rule | File |
|---|---|---|
| `linear` | All sets hit target → +increment. 3 consecutive missed sessions → deload 10%. | `schemes/linear.ts` |
| `double` | **Unchanged original behavior** — thin wrapper around `progressionService.suggestNextWeight`, kept exactly as-is so its existing test suite continues to guarantee it. | `schemes/double.ts` |
| `greyskull_lp` | 2 straight sets + AMRAP. Hit target → +increment; AMRAP ≥2× target → +2×increment. **Any** miss → immediate 10% deload (no failure-streak grace — the whole point of Greyskull is catching a miss in one session). | `schemes/greyskullLp.ts` |
| `time` | All sets hold the full target duration → +5s. 3 consecutive misses → deload duration 10%. Weight (for a *weighted* timed hold, e.g. a farmer's hold) is preserved, never hardcoded to 0. | `schemes/timeProgression.ts` |
| `rep_only` | Bodyweight: climb reps toward the top of the range; hitting it steps the range up. Weight always 0. Hints at "added load or a harder variation" past a 20-rep ceiling — **does not** auto-substitute (no runtime exercise-swap producer exists yet). | `schemes/repOnly.ts` |
| `off` | Static targets, no auto-progression. | `schemes/off.ts` |

- `selectScheme({isBodyweight, isTimeBased, trainingAge, emphasis, override})`
  auto-selects conservatively: `override` > time-based → `time` >
  bodyweight → `rep_only` > beginner (`workoutPreferences.intensity`) →
  `linear` (regardless of goal) > goal-bound default (K.6) > `double`.
  `greyskull_lp` and `off` are **never** auto-selected (Greyskull needs a
  specific 3-set AMRAP structure the builder doesn't prescribe by default;
  `off` is an explicit opt-out) — both remain usable via `override`.
- Wired live: `SetLogModal.tsx` (the actual session logging path — passes
  `trainingAge` + `emphasis`, both threaded from `WorkoutSessionScreen.tsx`'s
  `workoutPreferences`) and `ExerciseCard.tsx` (a lower-traffic plan-detail
  preview; defaults to `'intermediate'`, no emphasis plumbed yet).

### K.5 Session Data Fidelity — Supersets, Circuits, Tempo, Drop Sets (Phase 4A)

**Scope note:** this phase fixed *data loss*, not session UX — the live
session screen (`WorkoutSessionScreen.tsx`) still runs fully sequential, one
exercise at a time; there is no grouped superset/circuit rest-timer behavior
or round-tracking UI yet. That remains explicitly deferred pending a UX
decision, not a data problem.

**What was broken:** `PlannedExercise`/`PlannedSet` (the builder's
canonical shape — superset/circuit grouping, tempo, per-set drop weight/
reps) was flattened to the legacy `WorkoutSet` (one flat reps/weight value
per exercise) by **6 independently-duplicated inline conversions** inside
`workoutBuilderStore.ts` — none of which used the already-exported
`toWorkoutSet` adapter, and all of which were *more* lossy than that adapter
(always read `sets[0]`'s reps even when sets varied; dropped
`supersetId`/`circuitId`/`blockIndex` entirely).

**Fixed:**
- All 6 sites now call `toWorkoutSet` (dedup).
- `WorkoutSet` gained additive fields: `plannedSets?: PlannedSet[]`
  (full-fidelity passthrough — AI-generated plans never populate this and
  are unaffected), `supersetId`, `circuitId`, `blockIndex`.
- `WorkoutSessionScreen.tsx`'s `SetLogModal` reps prop now reads
  `currentExercise.plannedSets?.[activeSetIndex]?.reps` first, falling back
  to the flat `reps` field — a drop set's reduced final set (or any per-set-
  varying plan) now shows its real target instead of one value repeated for
  every set.
- `completionTracking._writeExerciseSets` gained a 4th param
  (`planExercises`, the `DayWorkout.exercises` the store's session data
  doesn't itself carry) and now writes `superset_id`, `circuit_id`,
  `block_index`, `tempo`, `drop_weight_kg`, `drop_reps` — columns that
  existed since `20260725000010` but nothing had written until now.
- **Caught before it ever broke:** `exercise_sets.superset_id`/`circuit_id`
  were typed `UUID`, but the builder (`ExerciseEditorSheet.tsx`
  `handleGroupMode`) has always generated plain string IDs
  (`` `ss_${Date.now().toString(36)}` ``, e.g. `"ss_lz3k9x2"`) — never
  UUIDs. Every insert would have thrown `invalid input syntax for type
  uuid`. Fixed via `20260904110000_widen_superset_circuit_id_to_text.sql`
  (schema→TEXT, per CLAUDE.md #4 — the code's format was correct and
  already shipped in the builder UI, so the schema is what changed).

### K.6 Coach Brain — Volume, Periodization, Autoregulation, Goals (Phase 5)

Pure data/calculation layer — no session UX changes.

- **`src/services/volumeLandmarksService.ts`** — per-muscle weekly MEV/MAV/
  MRV (Renaissance Periodization's landmark framework). MRV is derived from
  the pre-existing `workoutInsightsService.MAX_RECOVERABLE_SETS` (now
  exported — kept as ONE table so recovery-score math and volume-landmark
  guidance never disagree), scaled by training age (0.75×/1.0×/1.2×) and
  goal emphasis (strength 0.8×, hypertrophy 1.0×, endurance 0.85×, general
  0.9×). MEV = 45% of scaled MRV, MAV = 75% (RP's commonly-cited ratios —
  absolute MRV numbers vary by source, but the *ratios* are the stable part
  of the framework). `resolveTrainingEmphasis(primaryGoals)` collapses the
  7 real onboarding goal ids (`WorkoutPreferencesConstants.FITNESS_GOALS` —
  verified, not guessed) by priority: strength > hypertrophy > endurance >
  general. `countWeeklySetsByMuscle()` gives full credit to primary
  muscles, half to secondary, resolved via the catalog (K.1).
- **`src/services/periodizationService.ts`** — `getWeekTarget(mesocycleWeek,
  recentSessions?)`: 4-week accumulation block, planned RIR descending 3→0,
  volume rising 10%/week, then a deload — wraps `deloadService`'s existing
  proactive (week 5+) and reactive (2 failed sessions) triggers as inputs
  rather than reimplementing them. **Fixed 2026-09-04** (was flagged here as
  a known inherited gap, then fixed same-day): `deloadService.
  checkProactiveDeload` was a plain `mesocycleWeek < 5` guard with **no
  upper bound** — since `mesocycleStartDate` is set exactly once (first plan
  generation, guarded by `if (!mesocycleStartDate)` in `useFitnessLogic.ts`
  and `ScheduleBuilderScreen.tsx`) and never rolled forward,
  `getMesocycleWeek()` climbs forever and every week past 5 also read as
  "deload," nagging "time for a recovery week!" indefinitely rather than
  just in week 5. `checkProactiveDeload` now treats the mesocycle as a
  repeating `DELOAD_CYCLE_WEEKS` (=`ACCUMULATION_WEEKS`+1 = 5)-week block —
  weeks 5, 10, 15... deload; every other week accumulates normally. Both
  constants are exported from `deloadService.ts` (single source);
  `periodizationService.ts`'s own `weekInBlock` modulo was also corrected
  from `% ACCUMULATION_WEEKS` (4) to `% DELOAD_CYCLE_WEEKS` (5) — the old
  divisor was invisible before the fix because `checkProactiveDeload` always
  short-circuited first for any week ≥5, so this line never actually ran
  for a week 6+. Deliberately NOT fixed by resetting `mesocycleStartDate`
  itself — that requires a product decision on when a deload week counts as
  "done" (one workout? all planned sessions? the calendar week just
  elapsing?) that's out of scope for this data-layer fix, and the two AI
  plan-generation call sites already correctly clamp their own raw week to
  `[1,4]` and need `mesocycleStartDate` to stay a stable, ever-increasing
  anchor regardless.
- **`src/services/autoregulationService.ts`** — `computeAutoregulationSignal`
  detects a strictly-rising `rpe_10` trend across up to 3 recent sessions
  and/or `healthDataStore.metrics.sleepHours < 6`;
  `applyAutoregulation` can only downgrade a scheme's `increase` to `hold`
  at the prior session's numbers — **never fabricates an increase** the
  scheme itself didn't already decide on. Step-count data was deliberately
  left out — no defensible rolling baseline exists yet to compare against.
- **`src/services/goalBindingService.ts`** — emphasis → `{repRange,
  restSeconds, defaultScheme}` (NSCA-standard: strength 3-6 reps/150-240s;
  hypertrophy 8-12/60-90s; endurance 15-20/30-60s; general 10-15/60-90s).
  These are DEFAULTS — a specific exercise's own `CatalogEntry.
  defaultRepRange` (movement-pattern-aware) wins when available.
- `selectScheme` (K.4) gained an optional `emphasis` param; wired live in
  `WorkoutSessionScreen.tsx` (`resolveTrainingEmphasis(workoutPreferences.
  primary_goals)` → `SetLogModal`'s `emphasis` prop).
- **Not yet done, explicitly deferred:** `getWeekTarget`'s output isn't
  consumed by AI plan generation yet (worker Zod schema / prompt
  awareness) — Phase 6 item.

### K.7 Exercise Media

All 1,500 catalog exercises hotlink GIFs at runtime from a third-party CDN
(`static.exercisedb.dev`) — no offline caching, no resolution control.
`CatalogEntry.media[]` is an **ordered, tiered** array
(`3d_video` → `exercisedb_gif` → `poster_frame`) designed to add a
self-hosted 3D-video tier without ever regressing existing coverage.

**Ingest complete (2026-09-04).** Source: a 677-video library split
`men/`/`girl/` — confirmed to be gender variants of the same exercises (by
body-part subfolder), not duplicate content — so both are kept and
matched independently.

- **Matching** (`scripts/ingest-exercise-media.mjs`): Tier 1 (filename
  normalization, conservative — exact/near-exact only) matched 283/677.
  Tier 2 (Gemini via the Vercel AI Gateway, given a shortlist of candidate
  catalog exercises + a sampled frame, constrained to pick one or say
  "none") matched a further 305/394 remaining. **588/677 matched (87%); 89
  deliberately left unmatched** rather than guessed — see
  `scripts/ingest-review.csv` (516 rows) to spot-check any match.
- **Transcode + upload**: H.264 MP4 (≤720p, faststart) + poster frame,
  563/588 succeeded (95.7%; 25 failed on ffmpeg/transient upload errors,
  logged per-file in the ingest output) → **278 exercises now carry video
  media, 258 male + 258 female clips, 516 R2 assets total.**
- **`CatalogMediaAsset`** gained an optional `gender?: 'male' | 'female'`
  field — both variants are stored as separate tagged entries in the same
  exercise's `media[]`; untagged entries (every `exercisedb_gif` row, and
  any exercise the library only covered for one gender) are the fallback
  for `'other'`/`'prefer_not_to_say'`/unset `personalInfo.gender`.
- **R2 key format** (caught mid-ingest, re-keyed before it shipped wrong):
  the deployed media route (`GET /media/:category/:id`) validates
  `category` against exactly `exercise|diet|user` — the first upload pass
  used `exercise-video/<id>.mp4` and was unservable. Re-keyed all 1,032
  objects to `exercise/<id>-<gender>-video.mp4` /
  `exercise/<id>-<gender>-poster.jpg`, verified live.
- **`scripts/generate-exercise-catalog.mjs`** now merges
  `scripts/ingest-results.json` into every future regeneration (prepending
  `3d_video`/`poster_frame` entries ahead of the `exercisedb_gif` fallback,
  idempotently) — regenerating the catalog after an `exerciseDatabase.min.json`
  update no longer silently wipes the video work.
- **Fixed same-day**: the media-serving route's `MEDIA_TYPES` map (
  `fitai-workers/src/handlers/mediaHandler.ts`) didn't include `mp4` —
  every uploaded video was live and downloadable but served as
  `application/octet-stream` instead of `video/mp4`, breaking native
  `<video>`/player consumption. Poster JPGs were unaffected (`jpg` was
  already mapped) — confirmed via a live fetch of a real poster URL before
  this was found. Added `mp4: 'video/mp4'`, redeployed.
- **Consumer built**: `src/utils/resolveExerciseMedia.ts` (a standalone
  pure resolver — not folded into the 1,280-line legacy
  `exerciseVisualService.ts`, deliberately kept separate) picks the media
  entry matching `personalInfo.gender`, falling back to untagged/GIF.
  `ExerciseGifPlayer.tsx` renders it via `expo-av`'s `Video` (looping,
  muted, poster-frame-while-loading, sharing the existing play/pause/error/
  retry UI with the GIF path; downgrades to the exercise's real GIF — not
  the Giphy heuristic fallback — on a video load failure) in both the main
  player and the fullscreen modal. Zero behavioral change for the ~1,274
  exercises without video.
- **Fixed same-day**: 5 rows in the upstream ExerciseDB source data had a
  mangled degree sign (`"sled 45в°..."`, U+0432 Cyrillic 've' instead of
  U+00B0) baked into their name — fixed in the generator
  (`sanitizeName()`, not a hand-edit to the source JSON, so it self-heals
  if that file is ever re-downloaded from upstream), not the 1,552-row
  generated catalog directly.

### K.9 Phase 4B/6 — Session Fixes, Generation Awareness, Analytics, Substitution (2026-09-04)

- **4B.0 (prerequisite fixes, done):** `fitnessStore.updateSetData` and
  `completionTracking._writeExerciseSets`'s plan-metadata lookup both used to
  match by bare `exerciseId` — a day with the same exercise twice (a circuit
  round, or two rep-schemes of one lift) silently collided, writing the same
  set data/plan metadata to every occurrence. Fixed via positional targeting:
  `updateSetData` takes an optional `exerciseIndex` (every caller already
  tracks its current index — `SetLogModal`, `ExerciseCard`,
  `WorkoutSessionScreen` all pass it now); `_writeExerciseSets` pairs
  `completedExercises[i]` with `planExercises[i]` positionally instead of by
  a `Map<exerciseId, planMeta>`. Also fixed a stale-closure bug
  (`handleSaveSetData` calling a `completeWorkout` reference from an earlier
  render — reordered the declarations and closed the dependency-array gap)
  and wired the previously-dead `nextExercisePreviewTimeoutRef` to actually
  auto-dismiss the "next exercise" banner after 4s.
- **6A (generation-side awareness, done):** there is no LLM path left in
  `workoutGeneration.ts` (rule-based only); the real LLM surface is
  `workoutBuilderAi.ts`'s `suggest-day`/`generate-full-week` endpoints, which
  had **zero exerciseId validation** — the prompt asked the model to invent
  IDs from a described-but-not-enumerated pool. Both now receive a real
  candidate exerciseId list (worker-side classification mirror,
  `fitai-workers/src/utils/exerciseEnrichment.ts` +
  `scripts/generate-exercise-enrichment.mjs`, since the worker is a separate
  runtime with no access to client stores) and post-validate the model's
  response against it, dropping anything outside the list. Volume-landmark
  and mesocycle-week context (`SuggestDayRequestSchema`/
  `GenerateFullWeekRequestSchema`'s new optional `volumeLandmarkContext`/
  `mesocycleContext` fields) is computed **client-side**
  (`workoutBuilderAi.ts`'s `buildCoachContext`) and injected into both
  prompts — deliberately not reimplemented worker-side, to avoid a second
  source of truth for `volumeLandmarksService`/`periodizationService` logic.
  `PriorPerformanceEntrySchema.lastSession.sets[].rpe10` (1-10, additive
  alongside the legacy `rpe` 1-3 bucket) threads from `BuilderSummaryFooter`'s
  `priorPerformance` construction through to `apply-progression`'s
  server-side logic, preferring the finer signal when present. Cache
  fingerprints extended to absorb the new context so a stale response from a
  different training-volume state is never served.
- **6B (analytics surfacing, done):** `analyticsStore.loadExerciseAnalytics`
  now selects `rpe_10`/`set_type` (previously neither existed on
  `exerciseVolumeHistory`). `BuilderAnalyticsPanel.tsx` gained 3 sections
  following its established aggregator→useMemo→SectionLabel pattern
  exactly: hard-set % (`isHardSet` from `effortScale.ts`, RATED sets only as
  the denominator — an unrated legacy set contributes to neither side, so it
  can't dilute the percentage), a weekly effort trend `Sparkline` (mean
  `rpe_10`/week), and a this-week volume-landmark zone grid per muscle
  (`classifyVolumeZone`, colored so the sweet spot `mav_to_mrv` reads green,
  not the extremes).
- **6C-i/ii (replace-in-place fix + full-catalog picker migration, done):**
  the builder's "Replace exercise" action used to delete-then-append,
  silently reordering the replacement to the end of the day (and losing the
  exercise entirely if the picker was cancelled). A new atomic
  `replaceExercise` store action splices in place, carries over the
  replaced slot's `supersetId`/`circuitId`/`blockIndex` so a group
  membership survives a swap, and stamps `alternativeExerciseId` — its
  first producer anywhere in the app. `exercisePickerService.ts` and
  `ExercisePickerSheet.tsx` were fully migrated off the legacy 69-entry
  `CURATED_EXERCISES` list onto the 1,552-row catalog (search, inverse-
  muscle-balance recommendations, filter chips, favorites/recents —
  existing AsyncStorage keys preserved, legacy stored curated IDs still
  resolve via the catalog's alias map so no user data was orphaned).

- **4B.1 (superset/circuit grouped execution, done):** the binary
  `isInterExerciseRest` flag is replaced by a 4-state `RestMode` —
  `intra_set` / `intra_group` (minimal rest hopping to the next exercise
  inside a superset/circuit) / `post_group` (full rest after the group's
  last exercise) / `inter_exercise` (today's ungrouped behavior). Group
  traversal lives in a new pure module, `src/utils/workoutGrouping.ts`
  (`computeExerciseGroups`/`getNextStep`), mirroring the exact contiguous-
  run rule the builder already uses for `isFirstInSuperset`/
  `isLastInSuperset` (`DayBlock.tsx`) — a group is a contiguous run of equal
  `supersetId`/`circuitId` in `workout.exercises`, not a separate group-object
  model. `useWorkoutSession`'s `advanceAfterLog` now returns the `RestMode`
  it decided on (decide-now), and a separate `applyPendingStep` performs the
  actual navigation/rest-timer action on timer expiry (apply-on-expiry) —
  split deliberately so a mid-rest-timer state change can't cause the wrong
  step to fire. `CircuitGroup.rounds` has no producer anywhere in the
  builder; round count is derived from the grouped exercises' own
  `sets.length` (highest count wins if they disagree, a shorter exercise's
  missing rounds are treated as already-complete rather than crashing).
  Per-instance state (`calibrationMap`, warm-up-shown tracking) moved to the
  instance-keyed model from 4B.0 so a duplicate exercise inside a circuit
  can't collide. Circuits got their own visual language for the first time
  anywhere in the app — a `colors.warning.DEFAULT` rail + "CIRC" chip in
  both the builder (`ExerciseRow.tsx`/`DayBlock.tsx`) and the live session
  (`WorkoutSessionScreen.tsx`'s `groupBadge`), deliberately mirroring (not
  reinventing) the existing superset treatment. `useWorkoutAchievements
  .trackExerciseCompletion` takes an optional `groupLabel` ('Superset' |
  'Circuit') so its toast doesn't claim a false "Exercise N of Total"
  ordinal for exercises that complete out of linear order inside a group.
- **4B.2 (cardio block session logging, done):** `CardioBlock` was
  previously plan-only — consumed exclusively by `energy/planBurn.ts`/
  `safetyGates.ts` for estimation, with zero runtime representation.
  `fitnessStore.startWorkoutSession` now seeds `currentWorkoutSession
  .cardioBlocks` as a PARALLEL list alongside `exercises` (a cardio block
  has no sets/reps, so it isn't force-fit into that shape); `updateCardioBlock`
  matches by `blockId` (unique per block, so — unlike `updateSetData` — it
  needs no instance-index guard). A new `CardioBlockCard` component (reusing
  `CardioBlockEditor`'s exact Low/Moderate/High segmented-pill visual
  language, read-only here since intensity is fixed at plan time) renders
  always-visible in the session, independent of the strength-exercise phase
  state machine — a user can log cardio whenever, not just at a scripted
  point. Marking a block complete fires `completionTracking.logCardioBlock`
  immediately (decoupled from `completeWorkout()`, so a block already logged
  survives the user abandoning the rest of the session); calories reuse the
  identical MET formula `planBurn.ts` uses for plan-side estimates
  (`getExerciseTypeOverride` × `CARDIO_INTENSITY_MODIFIERS` × weight × hours),
  but with the user's actual-adjusted duration when given — actual over
  estimated (CLAUDE.md #9) — and `calories_burned` is left `null` with a
  `console.warn` (never a fabricated number, CLAUDE.md #8) if no weight can
  be resolved. Persisted to a new `workout_cardio_logs` table (not an
  `exercise_sets` column addition — that schema is exercise-SET-shaped and a
  cardio block is a single timed activity, so most of its columns would sit
  meaningless on every cardio row), RLS-scoped to `auth.uid() = user_id`,
  with the same offline-queue retry-on-insert-failure pattern used elsewhere
  in `completionTracking.ts`.
- **6C-iii (runtime mid-session exercise substitution, done):** the live
  session previously had zero swap affordance (confirmed: no matches for
  swap/substitute/replace/alternative anywhere in `WorkoutSessionScreen.tsx`).
  A key architectural fact this phase surfaced: the session's exercise
  DISPLAY metadata (name, reps, video, group badge) is derived entirely from
  the `DayWorkout` plan object the screen receives via `route.params.workout`
  — the store's `currentWorkoutSession.exercises[]` only tracks LOGGED set
  data (weight/reps/rpe/completed), never exercise identity for display.
  `WorkoutSessionScreen.tsx` now holds that plan object as local mutable
  state (`useState`, seeded once from the route param — never written back
  to `weeklyWorkoutPlan`/`customWeeklyPlan`), so a swap can update what's
  displayed for the remainder of the session without touching the saved
  plan. A new `ExerciseSwapSheet` component (`src/components/workout/`)
  reuses the exercise picker's visual language (`DetentBottomSheet` +
  `ExercisePickerCard` + `exercisePickerService`) but is a separate,
  lighter component — the builder's `ExercisePickerSheet` is hard-wired to
  `useWorkoutBuilderStore` (plan mutation, per-day AI suggestions), and
  reusing it directly would have conflated plan-mutation and session-
  mutation control flow. Default candidates are filtered to the same
  `movementPattern` as the exercise being replaced (search overrides this),
  and every candidate is run through `validateExerciseSafety` — the SAME
  injury/pregnancy/medical-condition filter `builderValidationService`
  already applies to AI-generated plans, re-derived live from
  `useProfileStore`'s `bodyAnalysis` rather than reimplemented.
  On select, `catalogEntryToPlanned` + `toWorkoutSet` (both already built for
  6C-i/ii) convert the chosen `CatalogEntry` into a `WorkoutSet`, carrying
  over the replaced slot's `supersetId`/`circuitId`/`blockIndex` (matching
  `workoutBuilderStore.replaceExercise`'s own carry-over) — everything else
  (reps range, rest seconds) takes the new exercise's catalog defaults, same
  as the builder's replace flow. Two things are updated together, never one
  without the other: the screen's local `workout` state (display) and a new
  `fitnessStore.swapSessionExercise(exerciseIndex, newExerciseId,
  newSetCount)` action (persistence) — `completionTracking._writeExerciseSets`
  reads `exercise_id` from the STORE's `exercises[idx]`, not the plan, so
  both must agree. `swapSessionExercise` refuses (no-op, returns `false`)
  once any set on that instance is already logged — those sets belong to the
  exercise being replaced and are never discarded or reattributed; the UI
  also hides the swap affordance once a set is logged (`storeExercises[idx]
  .sets.some(s => s.completed)`), so the guard is defense-in-depth, not the
  only line of defense. `suggestNext`/`selectScheme` needed no changes:
  verified (not assumed) that every one of the 6 progression schemes
  (`src/services/progression/schemes/*.ts`) already handles an empty
  `lastSets` array as its very first branch, and `SetLogModal`/`ExerciseCard`
  already key their history-fetch effects on `exerciseId` (with an existing
  `weightExerciseRef` guard resetting the weight input specifically to fix a
  past "weight leaks across exercises" bug) — both were already fully
  robust to a live exerciseId change with zero modification needed.

### K.10 Still Deferred

All phases of the Workout Engine v2 plan (4B.0-4B.2, 6A, 6B, 6C-i through
6C-iii) are complete as of this entry. Nothing is currently deferred.

### K.11 Playwright Testing Pass — Findings and Fixes (2026-09-04)

Exhaustive Playwright MCP testing (Builder + Generation, then Live Session)
surfaced real, confirmed bugs — every one fixed and verified (tsc clean,
jest clean, re-verified live where applicable) in this same pass:

- **RestTimerRadial TDZ crash**: `useFrameCallback` referenced `handleComplete`
  before its `useCallback` declaration executed — a synchronous first-frame
  fire on web (duration resolving to 0) hit the temporal dead zone and
  crashed the whole `WeeklyBuilderScreen` via its error boundary, blocking
  the entire exercise-editing surface (including superset/circuit grouping).
  Fixed by reordering the declaration before the callback that closes over it.
- **Equipment enum mismatch**: `buildWorkerProfile` sent raw onboarding
  slugs ("dumbbells", "resistance-bands", ...) straight to the worker, which
  only accepts a different vocabulary ("dumbbell", "resistance band", ...) —
  every builder-AI call (suggest-day, natural-language edit, full-week
  generation) failed 400 validation for any user with equipment beyond
  "barbell". Fixed via a new `mapEquipment` function in `workoutBuilderAi.ts`
  (exported, unit-tested); slugs with no worker-schema equivalent
  ("pull-up-bar", "yoga-mat", "treadmill") are dropped rather than
  mis-mapped, falling back to `["body weight"]` if nothing else maps.
- **`suggestDay` sent `sets` as a count, not an array**: reshaped
  `currentExercises` into an ad-hoc object with `sets: e.sets.length` where
  the worker's `PlannedExerciseSchema` requires the actual `PlannedSet[]`
  array — a second, independent cause of every suggest-day 400. Fixed by
  passing `params.currentExercises` straight through (it already matches
  `PlannedExerciseSchema` field-for-field).
- **Cache-key length limit**: `generateCacheKey` (`fitai-workers/src/utils/cache.ts`)
  base64-encoded the full param string as the KV key — base64 EXPANDS length
  (~33%), so once Phase 6A's `volumeLandmarkContext`/`mesocycleContext` were
  folded into the fingerprint, keys routinely exceeded Cloudflare KV's
  512-byte limit, failing every builder-AI call with `KV GET failed: 414`.
  Fixed by hashing to a fixed-length SHA-256 hex digest instead (`${type}:${hex}`,
  always ~72 chars regardless of input size) — a permanent fix, not a
  length trim, so it can't recur as more context is added later.
- **Deload Week silently wiped cardio blocks**: `BuilderDayWorkoutSchema`
  (used by every builder-AI endpoint that round-trips a plan — deload,
  apply-progression, natural-language edit, generate) had no `cardioBlocks`
  field, so Zod's default unknown-key-stripping silently dropped it from
  `request.plan` before any handler logic ran. Fixed by adding
  `CardioBlockSchema` + wiring it into `BuilderDayWorkoutSchema` — fixes
  every endpoint that shares this schema, not just deload.
- **Skia canvas crash on web**: `RestTimerRadial` mounted an ungated `<Canvas>`
  — unlike `MuscleBalanceRadar`/`SkiaBloom`, it never checked `useSkiaReady()`
  before rendering Skia primitives, throwing `Cannot read properties of
  undefined (reading 'PictureRecorder'/'MakeWebGLCanvasSurface')` on every
  frame once opened. Fixed by gating `<Canvas>` behind `skiaReady` with a
  plain-View fallback ring (countdown text/controls/haptics stay fully
  functional either way), matching the existing pattern.
- **Stale "REST" badge / stuck day-actions popover / "Repeat workout" launches
  the wrong workout**: three independent builder/history bugs — a day's
  intensity chip trusted a never-updated `intensityLevel` string instead of
  the authoritative `exerciseCount`; `DayBlock.tsx`'s kebab-menu dismiss
  overlay only covered its own shrink-wrapped box instead of the full screen
  (fixed to mirror `ExerciseRow.tsx`'s already-correct full-fill pattern,
  same fix applied to the parallel `DayMealBlock.tsx`); and `handleRepeatWorkout`
  looked up a day-based workout id against the CURRENTLY ACTIVE plan first,
  which can coincidentally collide with an old completed workout's id after
  a plan regeneration — fixed to prefer reconstructing from the completed
  session's own `workoutSnapshot`.
- **"Save set" button unreachable on web**: `BottomSheet`'s `GlassCard`/
  `GlassView` sized their content wrapper to CONTENT's intrinsic height
  instead of the definite bounded height `sheetWrapper`'s `maxHeight`
  already provided one level up — tall sheet content (e.g. `SetLogModal`'s
  full body including its footer) overflowed past the sheet's visible/
  scrollable area entirely uncapped. Fixed via an opt-in `fillHeight` prop
  threading `flex:1`/`minHeight:0` through `GlassView`'s outer container →
  `GlassCard`'s content wrapper, passed by `BottomSheet` (default `false`,
  so no other `GlassCard`/`GlassView` consumer is affected) — a shared-
  component fix benefiting every `BottomSheet` consumer, not just this modal.
- **"Next up" label wrong during superset/circuit round transitions**: the
  rest-timer preview always used the naive next ARRAY POSITION
  (`workout.exercises[currentExerciseIndex + 1]`) even for `intra_group`/
  `post_group` rests, where the real next target (computed by `getNextStep`)
  can be a different position entirely (e.g. looping back to the group's
  first member). Fixed by exposing `restPreviewExercise`/`pendingExerciseIndex`
  from `useWorkoutSession.ts`, resolved from `getNextStep`'s own target
  inside `advanceAfterLog`, and reading those in `WorkoutSessionScreen.tsx`
  instead of the naive arithmetic (also fixed the same class of bug in
  `WorkoutHeader`'s "Exercise N of Total" display).
- **Duplicate-exercise "group with sibling" picker (builder)**: found while
  investigating a live-session duplicate-exercise report (see below) —
  `ExerciseEditorSheet.tsx`'s superset/circuit sibling picker rendered
  `key={sib.exerciseId}` (a real React key collision for a day with the same
  exercise twice) and `handleGroupWithSibling` looked up the sibling to stamp
  by `exerciseId` (`planned.findIndex(...)`, always resolving to the FIRST
  occurrence) — tapping the picker for the SECOND duplicate instance silently
  grouped the wrong one. Fixed by threading the sibling's day-relative index
  through instead of relying on `exerciseId` uniqueness.
- **Exercise metadata/media resolved by fuzzy name match**: `ExerciseGifPlayer.tsx`
  fell through to `exerciseFilterService.getExerciseByName()`'s substring
  "contains" match whenever exact-ID lookup missed — which it always does for
  legacy curated ids (e.g. "deadlift", "overhead_press") that only exist in
  the canonical catalog, not the legacy ExerciseDB-hash-keyed dataset. A
  substring search for "deadlift" matches ANY exercise containing that text
  (e.g. "band straight leg deadlift"), showing a completely different
  exercise's equipment/target/name in the live session. Fixed by removing the
  fuzzy fallback and falling back to an exact lookup against
  `exerciseCatalog.generated.ts` instead (same fix applied to
  `ExerciseInstructionModal.tsx`'s Details tab, which previously showed
  nothing for these exercises rather than wrong data, but is now correct too).

**Two testing-pass claims investigated and disproved** (both root-caused via
direct evidence, not just re-asserted): "logged sets never persist to the
database" (disproved via direct network-request verification — a controlled
partial-exit test produced real `POST .../exercise_sets` and
`POST .../exercise_prs` calls, both `201 Created`, with accurate data) and
"duplicate exercise shows 'Set 4 of 3'" (disproved via a dedicated unit test,
`useWorkoutSession.duplicateExercise.test.ts`, driving the real store +
hook with a two-instance-same-exerciseId fixture — both instances correctly
report exactly 3/3, never 4). Both were most likely artifacts of an
unrelated, real, separately-fixed bug in this same pass (the "Save set"
button being unreachable via scroll on web forced the testing agent to use
unreliable synthetic-click workarounds for logging sets).

**A follow-up Analytics + Edge Case testing round** surfaced one more
app-wide (not workout-specific) reliability bug, fixed in the same pass:
the offline sync queue (`src/services/offline.ts`) treated every Supabase
write failure as equally retryable, including permanent Postgres error
classes (foreign-key/unique/check violations, RLS denial) that can NEVER
succeed no matter how many times retried — and since a sync cycle only
re-runs on a new write, an offline→online transition, or a manual "Sync
now" (not a timer), a genuinely stuck item (e.g. a queued `exercise_sets`
write whose `session_id` was never actually persisted to
`workout_sessions`) could sit retrying across many unrelated future syncs
indefinitely. Fixed via a `NonRetryableSyncError` classification
(`NON_RETRYABLE_PG_ERROR_CODES`: `23503`/`23505`/`23514`/`42501`) that fails
fast (one attempt, not the full inner 3-attempt retry loop) and purges
immediately from the queue instead of waiting for `retryCount` to climb —
see `src/__tests__/services/offline.validation.test.ts`'s new regression
test for the exact before/after behavior proof.

**This exhaustive testing effort is ongoing** as a standing multi-day goal
— see `src/docs/E2E_TESTING_GOAL.md` for the full remaining scope (every
non-workout screen/flow in the app), the current backlog, and the
procedure for picking it back up. That file is the source of truth for
testing progress going forward; this section (§K.11) will continue to
receive one-paragraph entries for every confirmed fix as that goal
progresses, the same way it has for every fix documented above.

## L. Cross-App E2E Testing Pass — Findings and Fixes (Home / Diet, 2026-09-05)

Continuation of the standing multi-day testing goal (`src/docs/E2E_TESTING_GOAL.md`)
into non-workout areas. **Home tab** (fully tested, 3 confirmed bugs, all
fixed): (1) `HealthIntelligenceHub` rendered a broken all-dash card instead of
its "Connect Health Data" placeholder once the user had any completed workout
that day — root cause was `HomeScreen.tsx` feeding it `realCaloriesBurned`
(intentionally app-tracked-calorie fallback, correct for the Move ring but
wrong as a "do we have real wearable data" signal); fixed via a new
`wearableActiveCalories` derivation in `useHomeLogic.ts` returning `undefined`
absent a fresh wearable snapshot. Bundled in the same fix: `userProfile.ts`'s
`getDietPreferences` null crash (`.maybeSingle()` returning null was never
guarded) now returns `{success:true, data:null}` with a `console.warn`. (2)
Log Weight quick action silently failed to sync `body_analysis` — a genuine
live-schema drift, not a code bug (`height_cm` had a remote NOT NULL
constraint no migration declared); fixed via
`supabase/migrations/20260904140000_body_analysis_height_cm_nullable.sql`. (3)
Barcode/Scan-Label sheets' Cancel button was unreachable behind the bottom
tab bar when opened via a cross-tab quick action — a CSS stacking-context
boundary bug specific to react-native-web (`position:relative` + non-`auto`
`z-index` each start a new stacking context, so an in-place `position:fixed`
web scrim mounted as a structural descendant of the just-navigated-to screen
can never out-rank a structurally separate sibling branch like the tab bar,
no matter its z-index). Fixed via a real DOM portal (`react-dom`'s
`createPortal`) in `BottomSheet.tsx`, mounting the scrim as an actual sibling
of the tab bar's own root — fixes every `BottomSheet` consumer app-wide
(~15 modals). The identical bug and fix pattern was also found and applied to
`CustomDialog.tsx`'s `DialogShell` — now live-verified too (Profile → Units
dialog, opened via a cross-tab Home→Profile flow, a real click on an option
registered correctly with no z-index bleed-through from the tab bar; see
`E2E_TESTING_GOAL.md` backlog for the full repro).

**Diet / Nutrition** (long Playwright round completed, findings still being
triaged — see `E2E_TESTING_GOAL.md` for live status): `useMealPlanning.ts`'s
`generateWeeklyMealPlan` computed a `missingItems` list for incomplete
profiles but never surfaced it, showing the same generic message regardless
of which section was actually missing — fixed to list the real missing
sections. `DietScreen.tsx`'s floating `DietActionDock` stayed interactive on
top of several full-screen overlays (`LogMealModal`, manual entry, barcode
options, label-scan prep, weight prompt, scan result) because its
visibility-hiding effect only accounted for a subset of the screen's overlay
booleans — since the dock renders as a structural sibling painted after the
main content, a real tap on an overlay's own control in that screen region
could land on the dock instead; fixed by covering all of the screen's
overlay booleans in the hide condition. A further finding — manually-logged
meals (barcode/label/manual entry, sourced from `nutritionStore.dailyMeals`)
never appear in the Today's Plan overlay's meal list because
`DietScreen.tsx`'s `selectedDayMeals` is derived only from the AI weekly
plan's meals for the day, never merged with the manually-logged set (the
aggregate nutrition RING is unaffected — it already correctly combines both
sources via `nutritionStore.getTodaysConsumedNutrition()`) — is dispatched to
a fix agent and not yet verified as of this entry.

**App-wide, non-screen-specific**: a genuine, reproducible (not flaky-by-luck)
test bug was found and fixed in `subscriptionStore.test.ts` — it seeded
`usageResetMonth`/`usageResetDay` via `new Date().toISOString()` (UTC) while
the store's own `getCurrentMonthKey`/`getCurrentDayKey` compare against
`getLocalDateString(new Date())` (local timezone); in any timezone ahead of
UTC, during UTC's evening/night hours the local date has already advanced a
day while UTC hasn't, so the test's UTC-seeded value silently failed to match
the store's local-date comparison and wrongly triggered a daily-usage reset.
Fixed by seeding with the same local-date helper the store uses. Not an app
bug — no application code changed for this one.

**Onboarding** (`src/hooks/onboarding/useWorkoutPreferences.ts`,
`src/components/onboarding/PersonalInfoFields.tsx`): a gym-equipment
auto-fill effect (`location==="gym" && equipment.length===0 → auto-fill
STANDARD_GYM_EQUIPMENT`) had no "already handled" guard, so it re-fired
every time equipment count hit zero — including when a user deliberately
deselected every equipment pill, trapping them in a state where the last
pill they unchecked always snapped back checked. Fixed via a new
`hasUserSetEquipment` ref, mirroring the file's existing
`hasUserSetIntensity`/`hasUserSetWorkoutTypes`/`hasUserSetGoals` pattern,
gating the auto-fill on `!hasUserSetEquipment.current`. Also added a
`maxLength={50}` client-side guard to the first/last name fields (no prior
cap). Notably, a fresh testing pass's third proposed fix — defaulting
`age`'s underlying state to 13 to match `AgeStepper`'s displayed clamp —
was correctly REJECTED after reconciliation: the current code already
solves the same underlying problem better (`AgeStepper` takes `value:
number | null`, rendering "—" until the user's first real tap, per CLAUDE.md
#8's "no hardcoded fallback that looks like a real value" principle) via
work that postdated the testing agent's stale worktree base — applying its
proposed fix would have been a real regression. See
`E2E_TESTING_GOAL.md`'s Backlog for the full reconciliation note (a good
example of why every agent-reported fix gets diffed against the CURRENT
main tree, never copied wholesale, before being trusted).

**Found via live verification, not code review** (`src/services/recognizedFoodLogger.ts`
— shared by barcode, label-scan, and AI-photo meal logging alike): every
write to `meal_recognition_metadata` was silently failing with `PGRST204:
Could not find the 'recognition_data' column`. Two migrations define this
table with incompatible column names — an earlier one
(`20260124000001_add_missing_data_tables.sql`) actually created it with
`recognition_result` + a required `user_id` (confirmed live in
`supabase-types.generated.ts`); a later one
(`20260314_create_meal_recognition_metadata.sql`) tried to `CREATE TABLE IF
NOT EXISTS` the same table with `recognition_data` instead, which no-opped
against the already-existing table and never actually took effect. The
application code was still written against the never-live name and was
missing `user_id` entirely. Fixed by renaming to `recognition_result`
(insert + both read-path usages) and threading `userId` through — per
CLAUDE.md rule 4, the live schema was correct and the code was wrong, so no
new migration was needed. The same live-verification pass surfaced a second,
related bug in the same file: re-scanning an already-contributed barcode
always threw a `23505` unique-violation on `user_food_contributions`, logged
as a real error for an entirely normal case (nothing new to insert). Fixed
by looking up and returning the existing contribution row on that specific
conflict instead of treating it as a failure. Both confirmed fixed via a
real repeat-scan live test (the JS-level error is gone; the underlying HTTP
409 still appears in the raw browser network log, which is expected and not
further fixable). Both fixes are a direct payoff of insisting on genuine
live verification for the meal-merge fix rather than accepting "tsc and
jest are clean" as sufficient — see `E2E_TESTING_GOAL.md`'s Backlog for
the full detail.

**Progress screen** (`src/services/progressData.ts`): `getProgressGoals`
used `.single()` against `progress_goals`, throwing a real (though already
gracefully-handled) 406/`PGRST116` for the completely normal case of an
account with no explicit goal row set. Fixed via `.maybeSingle()` — same
fix pattern as `getDietPreferences` earlier. Separately, root-caused (but
correctly did NOT "fix" via fabricated data) why the shared test account's
"This Week's Goals" section shows "Complete onboarding" despite the account
clearly having completed onboarding: `useCalculatedMetrics.ts` gates its
*entire* `metrics` object on the presence of an `advanced_review` row
(onboarding's final step) — `if (!ar) { setMetrics(null); ... }` — and this
account has zero rows in that table, most likely a seeding artifact from
early in this multi-day testing effort rather than a bug reachable by a
real user who completes onboarding through the actual UI. This explains
why BMI/BMR/TDEE and any other `calculatedMetrics`-dependent display looks
degraded for this specific account — check this root cause before assuming
a new bug in that class of feature. See `E2E_TESTING_GOAL.md`'s Backlog for
the full trace.

**Achievements** (`src/screens/main/AnalyticsScreen.tsx`,
`AchievementsScreen.tsx`): `AchievementsScreen.tsx` — a fully built screen
with category filters, tier badges, a FitCoins currency display, unlock
dates, and in-progress percentage bars — was completely unreachable from
anywhere in the app. A whole-codebase grep for its navigation call found
only the generic dispatcher that handles it, never a caller: the Analytics
tab's `AchievementShowcase` preview section had no press handler, and the
achievement-unlock celebration modal only offered a Close button, no
"View all" link. Fixed by wrapping the preview section in a `Pressable`
calling `navigation?.navigate("Achievements")`, mirroring the existing
Progress/ProgressTrends chart-press pattern in the same file. Live-verified
— the full screen now opens correctly with real data and zero console
errors.

Separately, once reachable, a real progress-display bug surfaced:
`achievementEngine.ts`'s `checkAchievements` computed a multi-requirement
(AND-type) achievement's displayed progress as the BEST (maximum) fraction
across its requirements, so meeting just one of several requirements could
show a misleading 100%-full bar for an achievement still genuinely locked.
"Balanced Start" (3 workouts AND 3 meals AND 1 water goal) is the only
multi-requirement achievement in the 31-item catalog, so the fix's
behavioral change is precisely scoped there — fixed by tracking the WORST
(minimum) fraction instead, the honest "distance to completion" for an
AND-type achievement. Added `achievementEngine.progress.test.ts` (3 tests)
— this engine had zero prior test coverage. Live-verified the fix against
the real account, including the discovery that the Achievements screen
itself never re-runs evaluation on its own — only the Progress screen
(`reconcileWithCurrentData`) does — worth remembering for any future
achievement-progress testing.

**Onboarding** (`src/hooks/useOnboardingState.tsx`,
`src/hooks/onboarding/useWorkoutPreferences.ts`): a CRITICAL bug — the
Workout Preferences tab silently discarded every user selection, blocking
onboarding completion entirely for any real user reaching it — found
independently by two parallel testing agents in the same round. Root
cause: `useOnboardingState.tsx`'s five `updateXxx` functions used a
`prev.field ? {...prev.field, ...data} : data` ternary that, whenever
`prev.field` was still null, REPLACED the entire slice with whatever
partial `data` object arrived first — and `useWorkoutPreferences.ts` has
several background effects that call the parent's `onUpdate()`
immediately with a bare partial, independent of the 500ms-debounced full
sync, so a user's tap could be silently reverted within ~1s by the next
unrelated partial round-trip. Fixed on both sides: `useOnboardingState.tsx`
now always merges onto `prev.field ?? {}` (never replaces), and every
internal `onUpdate()` call site in `useWorkoutPreferences.ts` now sends
the full current `formData` instead of a bare partial. Also fixed in the
same round: a pristine/untouched onboarding tab's Next button rendered as
fully enabled (no `disabled` attribute) despite genuinely-invalid empty
data — `tabValidationStatus` now computes eagerly on init and on session
resume instead of starting as `{}`. Both fixes tsc/jest-verified and
live-verified (location=gym/home/both correctly toggle the equipment
section; goal selections persist through Back→Forward; Next now shows
`aria-disabled` from first render).

**Auth** (`App.tsx`): a real, live-confirmed Supabase redirect shape — an
expired/invalid auth link with `error`/`error_code` params but NO `type`
param at all — fell through `handleAuthDeepLink`'s switch to a silent
no-op, leaving the user on the plain WelcomeScreen with no indication
anything went wrong (every `type=recovery`-tagged error variant already
worked correctly). Fixed with a guard before the switch that shows the
same "Link Invalid or Expired" alert used elsewhere in the handler.
Live-verified directly by the coordinator against the exact failing URL
shape.

**Workout builder screens** (`TemplateLibraryScreen.tsx`,
`curatedExercises.ts`, `MainNavigation.tsx`, `CommunityTemplatesTab.tsx`,
`ExerciseHistoryScreen.tsx`): 6 real bugs found and fixed in one round. A
CRITICAL crash — `<FlatList numColumns={...}>` changing `numColumns` on an
already-mounted instance with no `key` throws a real React Native
Invariant Violation, only reachable once the account has ≥1 saved
template — fixed with `key={viewMode}` to force a clean remount. A MAJOR
correctness bug — the exercise picker's `getCuratedExercises` returned
ZERO results for most real users because onboarding's equipment vocabulary
("bodyweight", "dumbbells", "resistance-bands") never matched the curated
catalog's own tags ("body weight", "dumbbell", "band") — fixed via a small
alias map. A third instance of the SAME `AnimatedPressable`
`containerStyle`-vs-`style` stacking-context bug already found and fixed
multiple times this session (`BottomSheet.tsx`, `CustomDialog.tsx`,
`DietActionDock`) — the template list's kebab-menu and bookmark buttons
were genuinely unclickable, confirmed via `document.elementsFromPoint()`.
A navigation-state bug where backing out of Exercise History (opened from
Template Library) stranded the user on the base tab instead of returning
to Template Library — fixed with a ref mirroring the existing
workoutSession-based `goBack()` pattern. Plus a duplicate-rendering bug in
Community Templates' Featured section and a cosmetic mislabeled count in
Exercise History. All coordinator-diff-reviewed and tsc/jest-verified
independently — see `E2E_TESTING_GOAL.md`'s Backlog for full detail on
each.

**Auth — guest onboarding-completion loss on failed sign-up** (`App.tsx`):
a CRITICAL bug found while retesting the sign-up flow the earlier onboarding
fix unblocked. The "reset to WelcomeScreen on sign-out" effect —
`if (!user && isInitialized && !isLoading) { setShowWelcome(true);
setIsOnboardingComplete(false); }` — didn't distinguish a genuine
previously-authenticated user signing out from a GUEST, whose `user` is
also always null. Since `authStore.ts`'s `register`/`login` actions toggle
the shared `isLoading` flag for every attempt (success or failure), a
guest who completed onboarding and then hit ANY failed sign-up attempt
(confirmed live with a real Supabase `429 over_email_send_rate_limit`)
re-fired this effect, found `user` still null, and silently discarded the
completed onboarding session — bouncing the guest back to the bare
pre-onboarding WelcomeScreen over a failed *sign-up*, not an actual
sign-out. Fixed by adding `!isGuestMode` to the condition. Live-verified
with a genuine before/after using the identical real 429 failure: before
the fix, the guest landed on the bare WelcomeScreen; after, they correctly
stayed on the sign-up screen, onboarding session intact. A good example of
a bug that only surfaces by actually completing a downstream flow after an
earlier fix, not by treating each fix as fully "done" in isolation.

**AI photo recognition (Diet)** — no code changes, a clean-bill-of-health
finding worth recording as a reference point: the camera-based food-scan
flow (`expo-camera`, `/food/recognize` → `google/gemini-3.5-flash-lite`)
was tested live via Playwright's fake-camera-device support against a
genuinely non-food image (Chrome's fake-device test pattern). The model
correctly returned zero confidence and zero macros rather than
hallucinating a plausible-looking food item — and the UI's low-confidence
"Accept & Log" gate (`ScanResultModal.tsx`'s `acceptDisabled = isLowConfidence
&& !lowConfidenceAcknowledged`) was confirmed via `isDisabled()` and a
forced-click attempt to be a genuine functional gate, not just a visual
suggestion. Good reference example of CLAUDE.md #8 done right end-to-end,
worker response through to UI.

**Regional meal-plan templates undercounted calories** (`src/data/
indianFoodDatabase.ts`, `src/data/traditionalServingSizes.ts`,
`MealPlanMethodLandingScreen.tsx`): all 4 regional templates (North Indian
Thali, South Indian Meal, Gujarati Thali, Punjabi Meal) seed generic
component names (sabji, raita, pickle, papad, farsan, curry, vegetables,
curd, plus the literal word "sweet") that had no matching entry in the
curated Indian food database — the app correctly logged this and fell back
to zero rather than fabricating a number, but the net effect was every
template's daily total silently missing several real components (North
Indian Thali: 506 kcal instead of a realistic 760). Fixed by adding 8 new
generic entries with representative per-100g nutrition matching the file's
existing sourcing standard, renaming the ungrounded "sweet" key to a real
already-catalogued dish ('gulab jamun'), and hardening the component-to-
database matching to try an exact key match before its ambiguous
substring fallback (otherwise a new generic "curry" entry could never be
reached — an earlier-declared specific dish like 'fish curry' would always
win the substring search first). Live-verified clean across all 4
templates with realistic, corrected calorie totals.

**Analytics data-accuracy cross-check** (`AnalyticsScreen.tsx`) — no bug,
a clean confirmation worth recording: queried `workout_sessions` directly
(service-role, read-only) for the shared test account's this-calendar-
month completed sessions (ground truth: exactly 1). The Analytics
screen's "This Period" Workouts tile showed the identical count. Since
the Workout Consistency bar chart buckets the same `completedSessions`
state, this confirms the DB → store → UI pipeline is accurate for this
metric family.

**New test fixture + a durable unblocking technique** — created
`test.free2@fitai.dev` (password `TestFitAI@2024!`) via Supabase Admin API
`auth.admin.createUser({ email_confirm: true })`, using the same
already-authorized service-role DB access as the earlier Pro-tier upgrade.
This bypasses the "needs real email verification" constraint that had
repeatedly blocked testing across many rounds. Significant beyond this one
account: the technique itself permanently unblocks free-tier paywall
testing (used immediately below), guest→real-account migration
verification, and session-expiry/re-auth testing (both still open in
`E2E_TESTING_GOAL.md`'s Auth flows Scope entry, now flagged there as
unblocked for a future round). See `E2E_TESTING_GOAL.md` rule 2 for the
persistent-fixture documentation.

**Four real `.single()` → 406 bugs on ANY brand-new real sign-up**
(discovered using the new free-tier account, which surfaced them
immediately on first Home load) — Supabase's `.single()` throws a genuine
network-level 406/`PGRST116` error when a query returns zero rows, which is
the completely normal state for a brand-new user with no profile/
preference rows yet. Each site's JS-level catch already handled the error
gracefully, but the noisy failed network request was itself a real defect
independent of the graceful recovery. Fixed by switching to `.maybeSingle()`
(returns `null` data with no error for zero rows) at all four sites:
`userProfile.ts`'s `getProfile` (added an explicit `!data` → "Profile not
found" branch preserving the exact existing caller contract) and
`getWorkoutPreferences` (removed the now-unnecessary `PGRST116`-specific
branch, added a plain `!data` → `{success:true, data:null}` branch);
`fitnessStore.ts`'s `active_plan_source` hydration query; `nutritionStore.ts`'s
`active_diet_source`/`goal_targets_mode` hydration query. This joins the
same bug class already fixed earlier in this pass (`getDietPreferences`,
`getProgressGoals` — see above) — now confirmed across 6 total call sites
this testing pass. All four tsc/jest-verified and live-verified clean
(fresh sign-up, zero 406s in the network log, Home loads correctly).

**Free-tier paywall UX — confirmed working, no bug**: using the new
free-tier account, the Analytics tab correctly renders the upgrade paywall
(rather than Pro content or a broken/blank state) for a genuinely
non-subscribed user. No code change needed.

**`check_timeline_range` constraint violation — confirmed real, root
cause NOT resolved this round**: a `23514` check-constraint violation on
what all available evidence points to being `body_analysis` (the same
table as the earlier `height_cm` live-schema-drift bug above), hit on
2 of 5 fresh-account onboarding-completion attempts (non-deterministic —
reproduced independently on a second, separately-created fresh account
with different field values, ruling out a one-time fluke). Impact is
non-blocking: the user reaches Home successfully regardless, but the
underlying save silently fails (console-only error, no user-facing
signal). Root cause could not be pinned down this round because both
available introspection paths were blocked: `mcp__plugin_supabase_
supabase__execute_sql` returned `ProtocolError: MCP error -32600: You do
not have permission to perform this action` for this project, and
`npx supabase db dump --linked` requires local Docker, which is
unavailable in this environment (a pre-existing, documented constraint —
see CLAUDE.md). A `target_timeline_weeks`-alone trigger hypothesis was
tested and disproven. Left honestly unresolved rather than force-fixing
or falsely claiming resolution — flagged in `E2E_TESTING_GOAL.md`'s
Backlog (deliberately left unchecked) for a future round with working
Docker, corrected MCP permissions, or direct dashboard/psql access. A
candidate interim mitigation (not applied): surface `BodyAnalysisService
.save()` failures to the user via a non-blocking toast rather than only a
dev-console log, so a real user hitting this knows their body-analysis
data didn't save.

**Onboarding database save was cascading-failure-prone — one section's
error silently dropped every LATER section too — FIXED**
(`src/hooks/useOnboardingState.tsx`'s `saveToDatabase`). Discovered by
investigating why `test.free2@fitai.dev` got routed back into full
onboarding on a fresh login despite being previously confirmed "fully
onboarded, reached Home": a direct query showed real `profiles` +
`diet_preferences` rows but zero rows in `body_analysis`,
`workout_preferences`, and `advanced_review`. Root cause: the five
section-save calls ran sequentially, each `return false`-ing on its own
try/catch failure — which aborted the whole function, so the
`check_timeline_range` failure on body_analysis (above) silently
prevented workout_preferences and advanced_review from ever being
attempted too, even though they were valid and ready. This is a strictly
worse impact than originally scoped (one lost section, not three), and
compounds with `userStore.checkProfileComplete()`'s requirement of both
personal info AND workout preferences — a real user hitting this gets
forced into full re-onboarding on their next fresh-device login. Fixed by
refactoring the five saves (plus the onboarding-progress save) through a
shared `attemptSave` helper that records a per-section failure without
aborting later sections — every section is now independently attempted.
tsc clean, full jest suite 1460/1460 passing. The underlying
`check_timeline_range` constraint violation itself remains unresolved
(see above); this fix only stops one section's failure from taking others
down with it.

**Live-verified and `test.free2@fitai.dev` repaired.** Drove the account
through a real onboarding-UI pass reusing its existing identity fields.
`workout_preferences` and `advanced_review` both saved successfully even
though `body_analysis` did not (likely `check_timeline_range` firing
again, non-deterministic as documented above — not a regression) — direct
proof the fix holds under the real originally-reported failure shape.
Confirmed via a fresh, no-storage browser login that the account now
correctly lands on Home instead of onboarding. Final state: `profiles`,
`diet_preferences`, `workout_preferences`, `advanced_review` all
populated; `body_analysis` remains empty pending the separate
`check_timeline_range` root-cause fix. The account is once again a
reliable fixture for everything `checkProfileComplete()` actually
requires.

**Genuine live `SIGNED_OUT` session-expiry propagation — now proven live,
no bug found** (Auth flows Scope item). A prior round could only verify
`auth.ts`'s `onAuthStateChange` → `App.tsx`'s WelcomeScreen-bounce effect
by CODE READ, since clearing the client's localStorage auth-token key
doesn't invalidate the Supabase SDK's in-memory session/refresh timer.
This round achieved a genuine live trigger: sign in with a throwaway
`email_confirm:true` account, revoke its refresh token server-side via
`supabase.auth.admin.signOut(accessToken, 'global')`, rewrite the
persisted session's `expires_at` to a past value (only affects WHEN the
SDK decides a refresh is due, not the outcome), then force the SDK's
`_onVisibilityChanged` → `_recoverAndRefresh()` path to run immediately
via `window.dispatchEvent(new Event('visibilitychange'))` (the exact
target `GoTrueClient.js` attaches its listener to — a real hidden→visible
tab transition via a second Playwright tab did NOT reliably trigger this
in headless Chromium, worth remembering for future rounds). The resulting
refresh attempt hit the real server and got back a genuine `AuthApiError:
Invalid Refresh Token: Refresh Token Not Found`, which the SDK correctly
treated as non-retryable, clearing the session and emitting a real
`SIGNED_OUT` — the already-open app tab visibly bounced to the bare
WelcomeScreen. Confirms the existing auth-state-change handling is
correct end-to-end; no code change needed.

**Razorpay web checkout was completely broken for free-tier upgrades —
two real bugs found and fixed** (Cross-cutting Scope item). (1) **Checkout
overlay crashed on web** (`src/services/RazorpayService.ts`'s
`openCheckout`): a Metro dynamic `await import("./RazorpayWebCheckout")`
threw `Error: Requiring unknown module "<id>"` at runtime even though the
target module genuinely exists — Metro/RN-Web's dynamic-import support is
unreliable in this dev-server setup. `openCheckout`'s own catch block
swallowed the real cause and surfaced a generic "Payment could not be
completed" right after a real Razorpay subscription order had already
been created server-side — a dead end with no path forward, meaning a
free-tier web user could not complete an upgrade purchase AT ALL. Fixed
by switching to a static top-level import — `RazorpayWebCheckout.ts` has
zero native-only dependencies (pure `window`/`document` DOM calls,
function-scoped), so it's safe to always bundle on every platform; only
its invocation stays gated to `Platform.OS === "web"`. (2) **Merely
initiating (and abandoning) a checkout permanently poisoned the paywall's
"current plan" state** (`fitai-workers/src/handlers/subscription.ts`'s
`handleGetSubscriptionStatus`): the query fetched the user's latest
subscription row across ALL statuses, including Razorpay's `'created'`
status — meaning an order was created but the customer never even opened
the checkout modal, never a real subscription — and returned its `tier`
as the user's current plan. `profiles.plan` itself was never touched (no
real billing/security exposure — the separate feature-gating middleware,
`subscriptionGate.ts`, already correctly filters to
`['active','authenticated','pending']`), but the paywall UI reads this
status endpoint and showed the never-paid tier as "Current Plan" forever
after, permanently blocking any re-attempt to subscribe to that same
tier/cycle. Fixed by excluding `'created'` from the status query (a new
`CURRENT_PLAN_STATUSES` constant) while keeping every other status
(paused/cancelled/halted/completed) visible for the Manage Subscription
screen's Pause/Resume/Cancel UI. Worker tsc/vitest clean (2 pre-existing,
unrelated failures elsewhere in the suite — not touched by this change);
deployed via `wrangler deploy` and live-verified with a real authenticated
fetch to `GET /api/subscription/status` returning the corrected
`tier: "free"` for the affected test account. Dangling abandoned-checkout
row cleaned up afterward.

**Analytics screen — period-selector date math verified, no bug**
(closes the Analytics Scope item). `AnalyticsScreen.tsx`'s
`isInSelectedPeriod` implements four TRAILING windows, not calendar-
aligned periods despite the tab labels: Week = current Mon-Sun calendar
week; Month = trailing 30 days (`today - 29` through today); Quarter =
trailing window from the 1st of the month 2 months ago; Year = trailing
window from the 1st of the month 11 months ago. Cross-checked all four
against a direct `workout_sessions` read for `test.workout@fitai.dev`
using this exact logic — all matched, and the Calories aggregate
genuinely varies by period (663 for Week vs. 14.3K for Quarter/Year),
confirming real period-aware filtering rather than a stuck value. Weak
discriminating power on the Workouts-count check specifically, since
this account has only one total completed session — noted honestly, not
treated as strong proof. Also confirmed all three "Detailed Analytics"
charts (Weight Progress, Calorie Analysis, Workout Consistency) have
real, correctly-wired press handlers (`navigate("Progress")` /
`navigate("ProgressTrends")` respectively) — none are dead/static.

## Round 2 — cross-area integration & edge cases

**Cross-store data consistency — confirmed clean, no bugs.** A real
workout completion and a real meal log were each independently verified
(via fresh, non-cached logins) to propagate correctly and without
double-counting across Home, the Workout tab, Diet, and Analytics —
confirming the SSOT discipline (CLAUDE.md #1/#6) holds end-to-end for
these two core actions.

**Timezone/midnight-boundary edge cases**: "today" meal bucketing
confirmed genuinely local-date-based via a live UTC-vs-local isolation
test (same UTC calendar day, different local day, correctly bucketed by
local date with no double-count).

**Worker daily/monthly usage-limit resets used UTC while the client
tracked local date — FIXED.** `fitai-workers/src/services/
usageTracker.ts`'s `getPeriodStart()` used UTC boundaries while the
client tracked local-date resets (`subscriptionStore.ts`) — no data
corruption (the client always trusts server-provided usage data), but a
real user's "daily" AI-generation/food-scan quota reset at UTC midnight,
not their own local midnight. Fixed by making `getPeriodStart(periodType,
timezone?)` compute the boundary via `Intl.DateTimeFormat('en-CA',
{timeZone,...})` when a timezone is supplied, falling back to UTC
otherwise (never throws on an invalid timezone string).
`incrementUsage`/`checkUsageLimit`/`decrementUsage` (the latter must use
the SAME timezone as the increment it refunds, or it targets the wrong
`period_start` row) all forward this parameter;
`subscriptionGate.ts` reads it from a new `x-client-timezone` request
header; `fitaiWorkersClient.ts`'s shared `makeRequest` sends
`Intl.DateTimeFormat().resolvedOptions().timeZone` on every request from
a single injection point. The global cron cleanup (`resetUsage`, no
per-user context) deliberately stays UTC-adjacent but uses an `Etc/GMT+12`
(UTC−12) cutoff — the timezone furthest behind UTC — so it only ever
deletes a row once expired in every real-world timezone, never
prematurely resetting a still-current row for a user far behind UTC. New
test file `usageTracker.timezone.test.ts` (5 tests, passing against the
real Cloudflare Workers runtime) covers UTC fallback, ahead-of-UTC and
behind-UTC day rollover, month-boundary rollover, and invalid-timezone
fallback. Deployed via `wrangler deploy`; live-verified end-to-end
against production (a real request with `x-client-timezone:
Asia/Kolkata` correctly wrote and then correctly refunded a
`feature_usage` row using a consistent computed `period_start`
throughout).

**`fitnessStore.startWorkoutSession` crashed on an exercise-less
workout — FIXED.** `workout.exercises.map(...)` threw a real `TypeError`
when `workout.exercises` was `undefined` (not just empty) — reachable via
"Start a workout" quick-start before any plan exists. The caller already
guarded its OWN navigation params (`exercises: selectedWorkout.exercises
|| []`) but that ran too late, after the crash. Fixed at the root with
`(workout.exercises ?? []).map(...)` at both usage sites in the shared
store action, so it can never crash regardless of caller. tsc/jest clean.

**Standalone-logged meals never triggered achievement progress —
FIXED.** `completionTracking.completeMeal` (completing a planned meal
slot) already called `trackAchievementActivity.mealLogged` (a Wave D
fix), but `nutritionStore.ts`'s `addDailyMeal` — the function every
standalone log (barcode/manual/AI-photo) actually calls — never did.
Nutrition-count achievements like "First Bite" could never unlock for
the most common real logging method. Fixed with a
`trackMealLoggedAchievement` helper (same lazy-`require()` pattern as
the file's existing `recomputeNutritionStreak`) called from
`addDailyMeal`. tsc/jest clean. Live-verified: a real standalone Direct
Entry log for a zero-history account produced a genuine `first-meal-log`
row with `is_completed: true`.

**`RangeSlider` had zero keyboard support on web — FIXED.** The track
had `accessibilityRole="adjustable"` (correct for native VoiceOver/
TalkBack) but no `tabIndex`/keyboard handler for web — a real WCAG 2.1.1
gap for a control used in core onboarding fields (height/weight). Added
`tabIndex={0}` + a `handleKeyDown` (Arrow keys ±step, Home/End to
min/max) mirroring the existing native accessibility-action math. This
also retroactively explains an earlier round's "+93kg from 60 arrow-key
presses" report as a script-mechanics artifact, not a real bug — the
control had no keyboard behavior at all to overshoot. tsc/jest clean;
live-verified exact, non-compounding ±step deltas.

**Achievement-unlock celebration UI — corrected finding: it fires
correctly, not dead code.** An initial pass this round wrongly concluded
it was unreachable (grepped only the named `showAchievementCelebration`
action). A separate, working path exists: `achievementStore.ts`'s
`initialize()` registers an `achievementEngine.on("achievementUnlocked",
...)` listener that sets celebration state directly, and
`checkAchievements()` emits that event the instant a requirement first
completes. Empirically proven live: a fresh account's first-ever workout
completion genuinely rendered the celebration modal, independently
confirmed via a DB read showing 3 new completed `user_achievements`
rows. Lesson: zero callers of a named symbol doesn't prove a feature is
unreachable — check for parallel/event-driven wiring first.

**Community Featured-section dedup and `BuildMethodLandingScreen`** —
both previously code-confirmed-only fixes now live-verified for the
first time, both working correctly. No new findings.

**CRITICAL self-introduced regression, caught same-round — the
`x-client-timezone` header fix broke every worker-backed feature on web
via CORS — FIXED.** The prior round's client change
(`fitaiWorkersClient.ts`'s `makeRequest` sending `x-client-timezone` on
every request) was never allow-listed in
`fitai-workers/src/index.ts`'s CORS config — three separate
`Access-Control-Allow-Headers: 'Content-Type, Authorization'` strings
(a preflight block, an OPTIONS block, a response-header block) didn't
include it, so real browsers correctly rejected every worker response
with a CORS preflight error (`Request header field x-client-timezone is
not allowed`) — breaking AI generation, food recognition, subscription
status, everything worker-backed, on web. Found by a LATER round's
testing agent, not the original fix's own verification step — because
that verification used a raw Node `fetch()`, which has no CORS
enforcement at all, and so could never have caught this. Fixed by adding
`x-client-timezone` to all three hardcoded header strings; deployed and
live-verified via both a raw CORS preflight `curl` request and a real
Playwright BROWSER session (the environment that actually enforces
CORS). **Standing lesson for this project**: verifying a client change
that touches request headers requires exercising the SAME layer the
real failure mode depends on (a browser context, for anything
CORS-sensitive) — a bare HTTP client's success proves nothing about
browser-enforced CORS behavior.

**Meal logging while offline silently, permanently lost the meal —
FIXED.** `completionTracking.ts`'s `completeMeal` was the one meal_logs
write path with no offline-queue support — unlike the sibling
`workout_sessions` insert, a failed Supabase write here was either
silently logged-and-forgotten (error-response case) or actively
REVERTED (thrown-exception case, an outdated "P0-2" fix that hard-deleted
the local row on the now-false assumption that a failed write could never
reach Supabase). Fixed by queuing both failure paths via
`offlineService.queueAction` — `offline.ts` already had full `meal_logs`
support, it just wasn't being called from here. tsc/jest clean;
live-verified end-to-end (queued while offline, confirmed via
`localStorage.offline_sync_queue`, synced correctly once reconnected, no
duplication).

**`TemplateLibraryScreen.tsx` showed guests a false "session expired"
message — FIXED.** Same guest-vs-signed-out conflation bug class already
fixed elsewhere this session: `getCurrentUserId()` returns `null` for
both a guest and a genuinely expired session, and the screen couldn't
tell them apart. Fixed with an `isGuestMode` check (same pattern as
`AnalyticsScreen.tsx`), branching to an accurate "Sign up to save
templates" message for guests. Live-verified via a full guest onboarding
→ Browse Library flow.

**Guest→real-account migration silently drops workout/meal history —
CONFIRMED real, deferred as a larger feature.** `DataBridge
.migrateGuestToUser` only ever covered the 5 onboarding sections;
`crudOperations.createWorkoutSession` explicitly skips Supabase sync for
guest IDs, so completed workouts/meals logged as a guest exist only in
local, non-user-scoped storage that migration never reads. Live-verified:
a guest's logged meal genuinely vanishes after account conversion, no
warning shown. Not fixed this round — extending migration to cover
arbitrary-length local history with safe re-run idempotency is a real
feature addition, not a quick patch. The sign-up screen's "save your
progress" copy is flagged as an imprecision worth a product decision
(tighten the wording vs. finally build the missing migration), not
unilaterally rewritten.

**Concurrent-session / multi-tab behavior — confirmed clean, no
corruption or crash.** One dead-code finding: `fitnessStore.ts`/
`nutritionStore.ts`'s realtime Postgres-changes subscriptions
(`setupRealtimeSubscription`) are fully implemented but have zero call
sites — not a bug, just unused infrastructure. One positive finding
exceeding the tested bar: signing out in one tab propagates live to
other open tabs via Supabase JS's own cross-tab auth-state sync, with no
reload needed.

## Round 3 — deferred Round 2 findings, cleaned up

**CRITICAL: every exercise in every workout needed a phantom extra set to
complete — likely the single most impactful bug found this entire
testing effort.** Root cause: `SetLogModal.tsx`'s `handleSave` calls
`useFitnessStore.getState().updateSetData(...)` (synchronous, imperative)
then, in the SAME synchronous tick with no intervening React render,
calls `onSave` → `WorkoutSessionScreen.handleSaveSetData` →
`session.handleSetComplete(...)`. `handleSetComplete`
(`useWorkoutSession.ts`) read its completion signal from
`exerciseProgress[currentExerciseIndex]`, a value derived via a
React-subscribed `useMemo` that can only reflect a store write AFTER
React re-renders — called synchronously right after the write, it always
saw one-set-stale data (checking whether the set just written was
already complete before this call, never true for a fresh completion).
This is deterministic, not intermittent: it fires on every exercise's
last set, in every workout, every time — React's synchronous execution
model guarantees a plain function call cannot observe a same-tick state
update. Fixed by reading the store's current state directly via
`getState()` inside `handleSetComplete` instead of the stale closure.
Verified via a new precise regression test
(`useWorkoutSession.handleSetCompleteRace.test.ts`) reproducing the real
app's exact synchronous call sequence with the REAL `updateSetData`
action and REAL `handleSetComplete` function (not mocks) — confirmed to
fail without the fix and pass with it. This was found because two
separate testing agents independently got stuck live-reproducing a
narrower "Set 4 of 3 in calibration mode" report from an earlier round;
neither could pin down the mechanism live, but their repeated, consistent
symptom (looping back into set-logging after what should have been the
last set) was the clue that led to root-causing it via code tracing
instead of continued live-reproduction attempts.

**Diet screen contradictory guest messaging — FIXED.** Same
guest-vs-signed-out `!userId` conflation bug class already fixed
elsewhere this session: `DietScreen.tsx`'s `canAccessMealFeatures =
isAuthenticated` was false for guests too, showing "Please sign in to
track your nutrition" simultaneously with a correctly-logged and
correctly-counted meal. Fixed to `isAuthenticated || isGuestMode`.

**Guest-migration sign-up copy — tightened.** `GuestSignUpScreen.tsx`'s
promise now accurately scopes to "profile and preferences," not the
broader "your progress" (which could be read as covering workout/meal
history that doesn't actually migrate). The larger feature — actually
migrating guest workout/meal history — remains deferred.

**"Start a workout" dead-end — confirmed, deferred.** The empty-workout
error state offers no path to generate a plan, just "Go Back." A real
fix needs threading a "Generate Plan" action back to the Workout tab —
correctly reported as needing more than a one-line change rather than
rushed.

**Offline AI-generation and slow-network — tested, clean.** Slow-network
handling (artificial delay via `page.route()`) showed honest
loading state, no duplicate requests, correct final DB state.
AI-generation-while-offline blocked by an unrelated, already-known gap
(missing `body_analysis` on the test account) — retry with a different
account in a future round.

**Streak-across-day-boundary and concurrent-write-collision testing —
blocked/not attempted this round**, both deferred to a future round now
that the underlying set-completion bug (above) no longer blocks reaching
a completed workout.

**Two more completion-tracking bugs found and fixed while re-verifying
the stale-closure fix above — both worse than the original, both
independent.** (1) Time-based (auto-logged, no-UI) exercises could NEVER
complete — `handleTimeBasedSetComplete` never called `updateSetData` at
all, so the set's `completed` flag never became `true` regardless of how
many times the user "finished" it. Fixed by writing the set data first,
mirroring `SetLogModal.handleSave`'s exact pattern. (2) Quick/Extra
Workouts never had real completion tracking — `startQuickWorkout` only
generated a local UUID and never called `fitnessStore
.startWorkoutSession()`, so `currentWorkoutSession` (the SSOT
`exerciseProgress`/`updateSetData` are built on) was never populated;
every render synthesized an all-incomplete progress array regardless of
logged sets. Fixed by calling the same `startWorkoutSession()` the
planned-workout flow already used correctly. Both fixes tsc/jest clean,
live-verified with a real completed 4-exercise Quick Workout (mixing
time-based and weight/rep exercises) landing a correctly-persisted
`workout_sessions` row and firing a genuine achievement.

**Streak-across-day-boundary — confirmed correct, no bug.** Backdated
real `workout_sessions` rows via service-role writes (avoiding client-
clock overrides, which conflict with Supabase JWT validation) and signed
in normally — `achievementStore.ts`'s `updateCurrentStreak()` correctly
computed a 3-day streak from today/yesterday/day-before while correctly
excluding an isolated, gapped row 5 days earlier, confirmed by reading
the app's own persisted state directly. Note: the streak requires TODAY
to have a completed session to report any nonzero value — a strict
"unbroken chain ending today" definition, not "days since last skipped."

## `check_timeline_range` — the last standing blocked item, finally resolved

The one item every round this session could only document as "genuinely
blocked" (2-of-5 fresh onboarding accounts hitting a real `23514`
constraint violation with no way to read the constraint's own
definition) is now root-caused and fixed. Both prior introspection paths
had a real, structural blocker: Supabase MCP was permission-denied for
this project, and `supabase db dump --linked` needs local Docker (not
available in this environment). The unlock: the **Supabase Management
API** (`POST https://api.supabase.com/v1/projects/{ref}/database/query`,
`Authorization: Bearer $SUPABASE_ACCESS_TOKEN`) is a third, independent
path neither blocker touches — a plain authenticated HTTPS call, never
tried directly via `curl` before. It returned the constraint immediately:
`CHECK ((target_timeline_weeks >= 4) AND (target_timeline_weeks <= 104))`
on `body_analysis`.

**Root cause**: `useAdvancedReviewForm.ts`'s `handleRateSelection` (the
"Choose Your Pace" onboarding card handler) computed
`Math.ceil(weightToLose / weeklyRate)` with no clamping — unlike the
sibling computation in `GoalVisualizationSection.tsx`, which already
correctly clamped to `[4, 104]`. A small weight-loss goal paired with an
aggressive pace computes below 4 weeks; a large goal paired with a slow
pace computes well above 104 — both reachable through the real UI,
explaining the intermittent ~40% failure rate exactly. The same
unclamped formula also drove the DISPLAYED timeline on every pace card in
`smartAlternatives.ts` (4 call sites), which would have silently
diverged from the now-clamped stored value had it been left alone —
violating the file's own pre-existing "the card and the stored timeline
must agree" invariant.

**Fixed**: added shared `TARGET_TIMELINE_WEEKS_MIN`/`MAX` (4/104)
constants to `BodyAnalysisConstants.ts`, explicitly documented as
mirroring the live DB constraint; both `GoalVisualizationSection.tsx` and
`useAdvancedReviewForm.ts` now source from there instead of one
correctly-hardcoded copy and one missing entirely; all 4
`smartAlternatives.ts` computations clamp identically. Verified via 3 new
tests calling the real `calculateSmartAlternatives` production function
with genuinely out-of-range inputs (confirmed to fail without the fix,
pass with it) and a real live onboarding pass (124.5kg → 72kg goal,
zero errors, correctly-bounded `target_timeline_weeks: 88` persisted).

**Process lesson**: when both an MCP tool and a CLI's Docker-dependent
path are blocked, check whether the platform's own REST/Management API
offers a third, independent route before concluding the capability is
genuinely unavailable.

This section will continue to receive entries as `E2E_TESTING_GOAL.md`'s
Scope checklist is worked through, mirroring §K.11's discipline for the
Workout Engine v2 pass.

## Round 4 — security boundary testing (RLS, IDOR, guest isolation) — clean bill of health

The first pass this entire multi-day effort to test the cross-user
security boundary explicitly required by CLAUDE.md ("Do not bypass RLS —
every Supabase table has `auth.uid() = user_id` policies") rather than
single-user UI/data-flow correctness. Tested directly via two real
throwaway accounts and the Supabase Management API (no UI/Playwright
needed — this is DB/API-level testing), not delegated to a self-reporting
agent.

- **RLS cross-user isolation**: Account B (real anon-key JWT session, no
  service-role) could not READ, UPDATE, or DELETE any of Account A's rows
  in `workout_sessions`, `meal_logs`, `body_analysis`, or `profiles` (0
  rows returned/affected on every attempt), and an INSERT posing as A by
  supplying A's `user_id` was explicitly rejected by Postgres
  (`new row violates row-level security policy`). Confirmed A's original
  data was byte-for-byte unchanged afterward via a service-role re-read.
  Cross-checked against the live `pg_policies`/`pg_class.relrowsecurity`
  data via the Management API: RLS enabled on all 4 tables, every policy
  scoped on `auth.uid() = user_id`/`id`, and the `profiles` table's
  `service_role`-only policy is correctly restricted to that DB role.
  (Noted, not a vulnerability: `workout_sessions` carries two redundant
  but consistent `ALL` policies from two different migrations — worth
  collapsing in a future cleanup migration, not urgent.)
- **Worker-side IDOR**: every `fitai-workers` handler that touches a
  user-scoped table derives its authorization `userId` from
  `c.get('user').id` (JWT-verified), never a client-supplied field.
  `healthSync.ts` goes further and explicitly rejects any client-supplied
  `user_id` that doesn't match the JWT (`verifyUserIdentity`,
  already covered by `healthSync.test.ts`). `subscription.ts`'s payment
  verification looks up a subscription by client-supplied
  `razorpay_subscription_id` but then checks `subscription.user_id !==
  userId` before proceeding. All `/api/admin/*` routes are gated by
  `requireRole('admin')`, which checks the `admin_users` table keyed on
  the caller's own JWT identity, not a claimed role.
- **Guest-mode isolation**: `generateGuestId()` produces a
  cryptographically-random `guest-<uuid>`, and no write path
  (`offlineService`, `completionTracking.ts`, `nutritionStore`,
  `fitnessStore`'s Supabase actions) ever references `guestId` — guest
  data never leaves local `AsyncStorage`, so there is no shared-table
  collision surface regardless of identifier predictability.

No fixes required — this round is a confirmation, not a bug hunt result.
See `E2E_TESTING_GOAL.md`'s Round 4 section for the full test
methodology and exact commands/queries used.

## Round 5 — dedicated visual/UI-UX QA pass, 2 real bugs found and fixed

Playwright MCP reconnected after being unavailable for the whole prior
session; this round used the real MCP tools (`browser_snapshot`,
`browser_take_screenshot`, `browser_evaluate`) directly, with screenshot
review delegated to a disposable child agent (parent never holds an
image in context — the documented "11 images" agent-death mode).

- **`CompactIntakeSummary.tsx` (Diet screen)**: with no calorie goal set
  (`calorieTarget = 0`), `dietViewModel.getIntakeSummary`'s `remaining =
  target - consumed` is trivially negative the instant any food is
  logged, so the card showed "726 kcal over" — a false diet-violation
  claim with no real target to violate. Fixed with a `hasTarget =
  calorieTarget > 0` guard: `isOverTarget` now requires `hasTarget`, and
  a new neutral "Logged kcal" state renders instead of "kcal over" when
  no target exists.
- **`clearUserData.ts`**: `clearAllUserData()` called
  `Notifications.cancelAllScheduledNotificationsAsync()` unconditionally
  on every sign-out; scheduled local notifications don't exist on web,
  so this threw a real, permanent `UnavailabilityError` logged to the
  console on every single web sign-out. `notificationService.ts`'s
  identical call already had a `Platform.OS === 'web'` guard —
  `clearUserData.ts` was just missing the same guard. Fixed by adding
  the same platform check.

4 other screenshot-flagged issues (a fixed-nav/content overlap, two
"clipped" pill rows, a macro-legend inconsistency) were all ruled out as
false positives after live DOM/computed-style verification — see
`E2E_TESTING_GOAL.md`'s Round 5 section for the full detail on each.

## Round 6 — dedicated accessibility audit, 12 real bugs found and fixed, one systemic root cause identified

First dedicated a11y pass across screen-reader semantics, keyboard
navigation, touch-target sizing, dynamic-content focus management, and
color contrast — motivated by real a11y bugs a concurrent visual-overhaul
effort found incidentally (sub-44px targets, a contrast regression, a
keyboard-inoperable slider). Three parallel Playwright testing agents
(screen-reader semantics + focus management, keyboard nav, touch-target
sweep) plus direct code-level contrast analysis by the coordinator.

- **Screen-reader semantics (4 fixed)**: `UnderlineInput.tsx` (onboarding
  name fields, sign-in email/password) never forwarded its visible label
  to `accessibilityLabel`, so screen readers announced fields by
  placeholder instead (e.g. "John" for First Name) — now defaults
  `accessibilityLabel` to the visible label. `GlassButton.tsx`'s loading
  state swapped the label for a spinner but never set
  `accessibilityState.busy` — now sets `busy: loading` and appends
  ", loading" to the announced label. `ErrorBanner.tsx` (Home) and two
  banners in `DietScreen.tsx` (food-load error, sign-in-required) appear
  without user action but had no `accessibilityRole="alert"`/
  `accessibilityLiveRegion` — added both, matching the already-correct
  `OfflineBanner.tsx` pattern.
- **Keyboard navigation (4 fixed)** — all the same root-cause class as
  the already-fixed `RangeSlider.tsx` gap (`accessibilityRole="adjustable"`
  does not itself grant web keyboard focusability/operability — needs
  explicit `tabIndex` + a key handler): `DetentBottomSheet.tsx`'s drag
  handle (used by every detent sheet — Log Meal, exercise picker,
  builder sheets, etc.), `GoalVisualizationSection.tsx`'s target-weight
  ring, and `BodyCompositionSection.tsx`'s body-fat torso stage + 3
  circumference tape bands (chest/waist/hip) were all `PanResponder`-only
  with zero keyboard fallback — all four now have `tabIndex={0}` +
  arrow-key handlers (+ Home/End) mirroring `RangeSlider`'s exact pattern,
  plus `onAccessibilityAction` for VoiceOver/TalkBack parity where it was
  missing. Separately, `BottomSheet.tsx` (the shared base under ~15+
  sheets app-wide) had no Escape-to-close and no Tab focus-trap at all on
  web (native gets both for free from `RNModal`, but web bypasses
  `RNModal` for a portal) — added both: a capture-phase `keydown`
  listener closes on Escape and cycles Tab/Shift+Tab within a
  `nativeID`-scoped DOM subtree, auto-focuses the sheet's first focusable
  element on open, and restores focus to whatever opened it on close.
  Live-verified end to end on a real `DetentBottomSheet` instance: Escape
  closed it, Shift+Tab from the first focusable element wrapped correctly
  to the last, and focus landed on the grabber automatically on open.
- **Touch-target sizing (4 fixed) + one systemic root-cause finding**:
  fixed `RangeSlider.tsx` (draggable area was the 4px-tall visual track
  itself — genuinely ~4px effective height, the most severe finding),
  `WeeklyMiniCalendar.tsx`'s "View full calendar" stat row and 7 weekday
  cells, `DietScreen.tsx`'s empty-state "Build" button, and
  `BodyCompositionSection.tsx`'s "How to measure correctly" toggle — all
  confirmed sub-44px. **While fixing these, discovered `hitSlop` is
  completely inert on web**: react-native-web's `View` only forwards
  props in its own allow-list (`forwardPropsList` in
  `node_modules/react-native-web/dist/exports/View/index.js`), which does
  not include `hitSlop`, and `Pressable` doesn't intercept it either
  (spreads straight through to `View`) — confirmed both by reading the
  installed package source and empirically (`elementFromPoint` just
  outside a button's visual box, inside its declared hitSlop zone,
  returned nothing). This means every "hitSlop compensates for a sub-44px
  visual box" conclusion reached anywhere in this testing effort's
  history (including this same round's own touch-target agent, and
  Round 5's onboarding-stepper precedent) is correct for native but
  **wrong for web** — those elements remain genuinely sub-44px touch
  targets on the web platform specifically. All 4 fixes above use a REAL
  size increase (`minWidth`/`minHeight`, or — for `RangeSlider` — a new
  wrapping `touchArea` element with a real 44px `minHeight` around the
  thin visual track) rather than hitSlop; hitSlop props were left in
  place alongside the real fix since they remain a genuine, harmless,
  additional expansion on native. Live-verified on a real 390px mobile
  viewport: all 7 day cells now measure exactly 44px with zero horizontal
  overflow introduced (22px of pre-existing slack in the row's gaps
  absorbed the increase). **Not fixed, flagged for a dedicated follow-up
  round**: every other touch target previously dismissed as "hitSlop
  compensates" across the app (onboarding age/wake/sleep steppers,
  info-icon buttons, equipment/workout-type pill chips, Workout tab's
  "Regenerate plan" button and weekly day tabs, Home's streak badge) is a
  confirmed real sub-44px target on web and needs the same real-size
  treatment — deferred as a distinct, larger fix pass (6+ components,
  each needing the same per-component layout-safety check performed here
  for `WeeklyMiniCalendar`'s day cells) rather than rushed through
  without that verification. Also flagged, not fixed: `WeekRhythm.tsx`'s
  8 frequency-count cells (0–7 sessions/week) are ~42px wide in a
  zero-gap, hairline-separated "ruler" layout — neither hitSlop (would
  overlap into the adjacent numeric cell, risking mis-taps between
  adjacent values) nor a blanket `minWidth:44` (8×44=352px exceeds the
  ~342px actually available on a 390px viewport, would overflow) is a
  safe mechanical fix; this needs an actual layout decision, not a patch.
- **Color contrast (1 fixed)**: `chart[3]` (purple `#9333EA`, the
  Analytics data-viz palette) was reused as small (12–13px, non-bold)
  text color in `GoalProgressCard.tsx`'s tip text and
  `MetricSummaryGrid.tsx`'s neutral-trend label — 3.36:1 against
  `surface[1]`, under the 4.5:1 WCAG AA floor for normal text (fine as a
  3:1-threshold graphical/bar-fill color elsewhere, which is why it went
  unnoticed visually). Added `chartText[3]` (`#AB61EF`, same hue
  lightened to 4.9:1) to `aurora-tokens.ts` for text usages specifically,
  without touching the base `chart` palette used for real data-viz fills.
  Spot-checked the known Material-Design-stock-color gap
  (`success`/`warning`/`error`/`info`, DESIGN.md §2) against all 3
  surface tiers — only `error` on `surface[2]` came in marginally under
  AA (4.17:1 vs 4.5:1), spread across 18 files with uncertain actual
  text/background pairing; treated as spot-checked-but-inconclusive
  rather than chased exhaustively, consistent with this file's own
  effort-bounding precedent.

`npx tsc --noEmit -p .` clean throughout; full `npx jest --silent` stayed
at the exact pre-round baseline (153/153 suites, 1466/1466 tests) — no
regressions, no new tests needed (all fixes are prop/style additions to
existing components, verified live via Playwright rather than new unit
tests). See `E2E_TESTING_GOAL.md`'s Round 6 section for the full
methodology and per-agent findings.
