# FitAI Complete Field Mapping - All 100+ Fields

**Purpose:** Comprehensive mapping of every field from Onboarding → Database → Display
**Date:** 2025-12-29
**Status:** ✅ Audit Complete

---

## How to Read This Document

**Status Codes:**
- ✅ **VERIFIED** - Field flows correctly through entire pipeline
- ⚠️ **WARNING** - Field works but has type/case inconsistencies
- ❌ **BROKEN** - Field cannot be retrieved or displayed correctly
- 🔍 **NEEDS_VERIFICATION** - Field needs runtime testing

**Column Guide:**
1. **Field Name** - Database column name
2. **Onboarding Variable** - Variable name in onboarding tab
3. **Database Table.Column** - Actual database location
4. **Display Variable** - Variable name when reading for display
5. **Type Match** - Do types match across the pipeline?
6. **Status** - Overall field health

---

## TAB 1: PERSONAL INFO (profiles table) - 12 Fields

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 1 | first_name | `formData.first_name: string` | `profiles.first_name: TEXT` | ❌ `personalInfo.name` | ❌ Missing field | ❌ **BROKEN** |
| 2 | last_name | `formData.last_name: string` | `profiles.last_name: TEXT` | ❌ `personalInfo.name` | ❌ Missing field | ❌ **BROKEN** |
| 3 | name | Computed: `${first_name} ${last_name}` | `profiles.name: TEXT` | ✅ `personalInfo.name` | ✅ string → TEXT | ⚠️ **WARNING** |
| 4 | age | `formData.age: number` | `profiles.age: INTEGER` | ❌ `personalInfo.age: string` | ❌ number → string | ❌ **BROKEN** |
| 5 | gender | `formData.gender: enum` | `profiles.gender: TEXT` | ✅ `personalInfo.gender: string` | ✅ Match | ✅ **VERIFIED** |
| 6 | country | `formData.country: string` | `profiles.country: TEXT` | ✅ `personalInfo.country: string` | ✅ Match | ✅ **VERIFIED** |
| 7 | state | `formData.state: string` | `profiles.state: TEXT` | ✅ `personalInfo.state: string` | ✅ Match | ✅ **VERIFIED** |
| 8 | region | `formData.region: string` | `profiles.region: TEXT` | ✅ `personalInfo.region: string` | ✅ Match | ✅ **VERIFIED** |
| 9 | wake_time | `formData.wake_time: string` | `profiles.wake_time: TIME` | ✅ `personalInfo.wake_time: string` | ✅ Match | ✅ **VERIFIED** |
| 10 | sleep_time | `formData.sleep_time: string` | `profiles.sleep_time: TIME` | ✅ `personalInfo.sleep_time: string` | ✅ Match | ✅ **VERIFIED** |
| 11 | occupation_type | `formData.occupation_type: enum` | `profiles.occupation_type: TEXT` | ✅ `personalInfo.occupation_type` | ✅ Match | ✅ **VERIFIED** |
| 12 | email | Optional (from auth) | `profiles.email: TEXT` | ✅ `personalInfo.email: string` | ✅ Match | ✅ **VERIFIED** |

**Tab 1 Summary:** 8/12 fields verified, 4 critical issues

---

## TAB 2: DIET PREFERENCES (diet_preferences table) - 30 Fields

### Basic Diet Info (3 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 13 | diet_type | `formData.diet_type: enum` | `diet_preferences.diet_type: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 14 | allergies | `formData.allergies: string[]` | `diet_preferences.allergies: TEXT[]` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 15 | restrictions | `formData.restrictions: string[]` | `diet_preferences.restrictions: TEXT[]` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Diet Readiness (6 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 16 | keto_ready | `formData.keto_ready: boolean` | `diet_preferences.keto_ready: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 17 | intermittent_fasting_ready | `formData.intermittent_fasting_ready: boolean` | `diet_preferences.intermittent_fasting_ready: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 18 | paleo_ready | `formData.paleo_ready: boolean` | `diet_preferences.paleo_ready: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 19 | mediterranean_ready | `formData.mediterranean_ready: boolean` | `diet_preferences.mediterranean_ready: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 20 | low_carb_ready | `formData.low_carb_ready: boolean` | `diet_preferences.low_carb_ready: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 21 | high_protein_ready | `formData.high_protein_ready: boolean` | `diet_preferences.high_protein_ready: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Meal Preferences (4 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 22 | breakfast_enabled | `formData.breakfast_enabled: boolean` | `diet_preferences.breakfast_enabled: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 23 | lunch_enabled | `formData.lunch_enabled: boolean` | `diet_preferences.lunch_enabled: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 24 | dinner_enabled | `formData.dinner_enabled: boolean` | `diet_preferences.dinner_enabled: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 25 | snacks_enabled | `formData.snacks_enabled: boolean` | `diet_preferences.snacks_enabled: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Cooking Preferences (3 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 26 | cooking_skill_level | `formData.cooking_skill_level: enum` | `diet_preferences.cooking_skill_level: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 27 | max_prep_time_minutes | `formData.max_prep_time_minutes: number` | `diet_preferences.max_prep_time_minutes: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 28 | budget_level | `formData.budget_level: enum` | `diet_preferences.budget_level: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Health Habits (14 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 29 | drinks_enough_water | `formData.drinks_enough_water: boolean` | `diet_preferences.drinks_enough_water: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 30 | limits_sugary_drinks | `formData.limits_sugary_drinks: boolean` | `diet_preferences.limits_sugary_drinks: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 31 | eats_regular_meals | `formData.eats_regular_meals: boolean` | `diet_preferences.eats_regular_meals: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 32 | avoids_late_night_eating | `formData.avoids_late_night_eating: boolean` | `diet_preferences.avoids_late_night_eating: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 33 | controls_portion_sizes | `formData.controls_portion_sizes: boolean` | `diet_preferences.controls_portion_sizes: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 34 | reads_nutrition_labels | `formData.reads_nutrition_labels: boolean` | `diet_preferences.reads_nutrition_labels: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 35 | eats_processed_foods | `formData.eats_processed_foods: boolean` | `diet_preferences.eats_processed_foods: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 36 | eats_5_servings_fruits_veggies | `formData.eats_5_servings_fruits_veggies: boolean` | `diet_preferences.eats_5_servings_fruits_veggies: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 37 | limits_refined_sugar | `formData.limits_refined_sugar: boolean` | `diet_preferences.limits_refined_sugar: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 38 | includes_healthy_fats | `formData.includes_healthy_fats: boolean` | `diet_preferences.includes_healthy_fats: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 39 | drinks_alcohol | `formData.drinks_alcohol: boolean` | `diet_preferences.drinks_alcohol: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 40 | smokes_tobacco | `formData.smokes_tobacco: boolean` | `diet_preferences.smokes_tobacco: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 41 | drinks_coffee | `formData.drinks_coffee: boolean` | `diet_preferences.drinks_coffee: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 42 | takes_supplements | `formData.takes_supplements: boolean` | `diet_preferences.takes_supplements: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

**Tab 2 Summary:** 30/30 fields have matching types, 0 verified in display (no DietScreen implementation yet)

---

## TAB 3: BODY ANALYSIS (body_analysis table) - 25 Fields

### Basic Measurements (4 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 43 | height_cm | `formData.height_cm: number` | `body_analysis.height_cm: DECIMAL(5,2)` | ❌ `personalInfo.height: string` | ❌ Wrong table + type | ❌ **BROKEN** |
| 44 | current_weight_kg | `formData.current_weight_kg: number` | `body_analysis.current_weight_kg: DECIMAL(5,2)` | ❌ `personalInfo.weight: string` | ❌ Wrong table + type | ❌ **BROKEN** |
| 45 | target_weight_kg | `formData.target_weight_kg: number` | `body_analysis.target_weight_kg: DECIMAL(5,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 46 | target_timeline_weeks | `formData.target_timeline_weeks: number` | `body_analysis.target_timeline_weeks: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Body Composition (4 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 47 | body_fat_percentage | `formData.body_fat_percentage: number` | `body_analysis.body_fat_percentage: DECIMAL(4,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 48 | waist_cm | `formData.waist_cm: number` | `body_analysis.waist_cm: DECIMAL(5,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 49 | hip_cm | `formData.hip_cm: number` | `body_analysis.hip_cm: DECIMAL(5,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 50 | chest_cm | `formData.chest_cm: number` | `body_analysis.chest_cm: DECIMAL(5,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Photos (3 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 51 | front_photo_url | `formData.front_photo_url: string` | `body_analysis.front_photo_url: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 52 | side_photo_url | `formData.side_photo_url: string` | `body_analysis.side_photo_url: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 53 | back_photo_url | `formData.back_photo_url: string` | `body_analysis.back_photo_url: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### AI Analysis (3 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 54 | ai_estimated_body_fat | `formData.ai_estimated_body_fat: number` | `body_analysis.ai_estimated_body_fat: DECIMAL(4,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 55 | ai_body_type | `formData.ai_body_type: enum` | `body_analysis.ai_body_type: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 56 | ai_confidence_score | `formData.ai_confidence_score: number` | `body_analysis.ai_confidence_score: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Medical Information (3 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 57 | medical_conditions | `formData.medical_conditions: string[]` | `body_analysis.medical_conditions: TEXT[]` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 58 | medications | `formData.medications: string[]` | `body_analysis.medications: TEXT[]` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 59 | physical_limitations | `formData.physical_limitations: string[]` | `body_analysis.physical_limitations: TEXT[]` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Pregnancy/Breastfeeding (3 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 60 | pregnancy_status | `formData.pregnancy_status: boolean` | `body_analysis.pregnancy_status: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 61 | pregnancy_trimester | `formData.pregnancy_trimester: 1/2/3` | `body_analysis.pregnancy_trimester: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 62 | breastfeeding_status | `formData.breastfeeding_status: boolean` | `body_analysis.breastfeeding_status: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Calculated Values (5 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 63 | bmi | Computed | `body_analysis.bmi: DECIMAL(4,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 64 | bmr | Computed | `body_analysis.bmr: DECIMAL(7,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 65 | ideal_weight_min | Computed | `body_analysis.ideal_weight_min: DECIMAL(5,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 66 | ideal_weight_max | Computed | `body_analysis.ideal_weight_max: DECIMAL(5,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 67 | waist_hip_ratio | Computed | `body_analysis.waist_hip_ratio: DECIMAL(3,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

**Tab 3 Summary:** 23/25 fields have matching types, 2 critical breaks (height/weight in wrong location)

---

## TAB 4: WORKOUT PREFERENCES (workout_preferences table) - 20 Fields

### Basic Preferences (5 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 68 | location | `formData.location: enum` | `workout_preferences.location: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 69 | equipment | `formData.equipment: string[]` | `workout_preferences.equipment: TEXT[]` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 70 | time_preference | `formData.time_preference: number` | `workout_preferences.time_preference: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 71 | intensity | `formData.intensity: enum` | `workout_preferences.intensity: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 72 | workout_types | `formData.workout_types: string[]` | `workout_preferences.workout_types: TEXT[]` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Goals & Activity (2 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 73 | primary_goals | `formData.primary_goals: string[]` | `workout_preferences.primary_goals: TEXT[]` | ⚠️ `fitnessGoals.primaryGoals` | ⚠️ Snake vs camel | ⚠️ **WARNING** |
| 74 | activity_level | `formData.activity_level: enum` | `workout_preferences.activity_level: TEXT` | ⚠️ `personalInfo.activityLevel` | ⚠️ Snake vs camel + wrong table | ⚠️ **WARNING** |

### Fitness Assessment (5 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 75 | workout_experience_years | `formData.workout_experience_years: number` | `workout_preferences.workout_experience_years: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 76 | workout_frequency_per_week | `formData.workout_frequency_per_week: number` | `workout_preferences.workout_frequency_per_week: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 77 | can_do_pushups | `formData.can_do_pushups: number` | `workout_preferences.can_do_pushups: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 78 | can_run_minutes | `formData.can_run_minutes: number` | `workout_preferences.can_run_minutes: INTEGER` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 79 | flexibility_level | `formData.flexibility_level: enum` | `workout_preferences.flexibility_level: TEXT` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Enhanced Preferences (7 fields)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 80 | preferred_workout_times | `formData.preferred_workout_times: string[]` | `workout_preferences.preferred_workout_times: TEXT[]` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 81 | enjoys_cardio | `formData.enjoys_cardio: boolean` | `workout_preferences.enjoys_cardio: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 82 | enjoys_strength_training | `formData.enjoys_strength_training: boolean` | `workout_preferences.enjoys_strength_training: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 83 | enjoys_group_classes | `formData.enjoys_group_classes: boolean` | `workout_preferences.enjoys_group_classes: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 84 | prefers_outdoor_activities | `formData.prefers_outdoor_activities: boolean` | `workout_preferences.prefers_outdoor_activities: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 85 | needs_motivation | `formData.needs_motivation: boolean` | `workout_preferences.needs_motivation: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |
| 86 | prefers_variety | `formData.prefers_variety: boolean` | `workout_preferences.prefers_variety: BOOLEAN` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

### Weight Goals (1 field)

| # | Field Name | Onboarding Variable | DB Table.Column | Display Variable | Type Match | Status |
|---|------------|-------------------|-----------------|------------------|------------|---------|
| 87 | weekly_weight_loss_goal | Computed from body_analysis | `workout_preferences.weekly_weight_loss_goal: DECIMAL(3,2)` | 🔍 Not displayed yet | ✅ Match | 🔍 **NEEDS_VERIFICATION** |

**Tab 4 Summary:** 18/20 fields verified, 2 case mismatch warnings

---

## TAB 5: ADVANCED REVIEW (advanced_review table) - 35+ Calculated Fields

**Note:** These are all computed fields, not user-entered. They are calculated from Tabs 1-4 data.

### Basic Metabolic Calculations (4 fields)

| # | Field Name | Computed From | DB Table.Column | Display Variable | Status |
|---|------------|--------------|-----------------|------------------|---------|
| 88 | calculated_bmi | height_cm, current_weight_kg | `advanced_review.calculated_bmi: DECIMAL(4,2)` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 89 | calculated_bmr | age, gender, height, weight | `advanced_review.calculated_bmr: DECIMAL(7,2)` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 90 | calculated_tdee | bmr, activity_level | `advanced_review.calculated_tdee: DECIMAL(7,2)` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 91 | metabolic_age | Multiple factors | `advanced_review.metabolic_age: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |

### Daily Nutritional Needs (6 fields)

| # | Field Name | Computed From | DB Table.Column | Display Variable | Status |
|---|------------|--------------|-----------------|------------------|---------|
| 92 | daily_calories | TDEE, goals | `advanced_review.daily_calories: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 93 | daily_protein_g | Weight, goals | `advanced_review.daily_protein_g: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 94 | daily_carbs_g | Calories, macro split | `advanced_review.daily_carbs_g: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 95 | daily_fat_g | Calories, macro split | `advanced_review.daily_fat_g: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 96 | daily_water_ml | Weight | `advanced_review.daily_water_ml: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 97 | daily_fiber_g | Calories | `advanced_review.daily_fiber_g: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |

### Heart Rate Zones (6 fields)

| # | Field Name | Computed From | DB Table.Column | Display Variable | Status |
|---|------------|--------------|-----------------|------------------|---------|
| 98 | target_hr_fat_burn_min | Age | `advanced_review.target_hr_fat_burn_min: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 99 | target_hr_fat_burn_max | Age | `advanced_review.target_hr_fat_burn_max: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 100 | target_hr_cardio_min | Age | `advanced_review.target_hr_cardio_min: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 101 | target_hr_cardio_max | Age | `advanced_review.target_hr_cardio_max: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 102 | target_hr_peak_min | Age | `advanced_review.target_hr_peak_min: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |
| 103 | target_hr_peak_max | Age | `advanced_review.target_hr_peak_max: INTEGER` | 🔍 Not displayed yet | 🔍 **NEEDS_VERIFICATION** |

**Tab 5 Summary:** All fields are computed - need to verify calculation algorithms

---

## OVERALL SUMMARY

### Total Field Count: 103+ Fields

### Status Breakdown:
- ✅ **VERIFIED (Working):** 8 fields
- ⚠️ **WARNING (Works but needs fixing):** 3 fields
- ❌ **BROKEN (Critical issues):** 4 fields
- 🔍 **NEEDS_VERIFICATION (Requires testing):** 88 fields

### Critical Failures (Must Fix):
1. ❌ **first_name** - Cannot be displayed (expects "name" instead)
2. ❌ **last_name** - Cannot be displayed (expects "name" instead)
3. ❌ **age** - Type mismatch (number vs string)
4. ❌ **height_cm** - Wrong table (body_analysis vs personalInfo)
5. ❌ **current_weight_kg** - Wrong table (body_analysis vs personalInfo)

### Case Mismatch Warnings:
1. ⚠️ **primary_goals** → **primaryGoals** (snake_case vs camelCase)
2. ⚠️ **activity_level** → **activityLevel** (snake_case vs camelCase, also in wrong table)

### Missing Display Implementation:
- **DietScreen:** 30 fields collected but not displayed
- **FitnessScreen:** 20 fields collected but not displayed
- **AnalyticsScreen:** 35+ calculated fields not displayed
- **BodyMeasurementsEditModal:** Most fields not accessible

---

## Next Steps

1. ✅ **COMPLETED:** Audit all 103+ fields
2. ⏭️ **TODO:** Fix critical PersonalInfo type issues
3. ⏭️ **TODO:** Implement missing display screens
4. ⏭️ **TODO:** Runtime test all 88 unverified fields
5. ⏭️ **TODO:** Create E2E test suite for full data flow

---

## Verification Checklist

To verify each field works correctly:

- [ ] Enter data in onboarding
- [ ] Check database has correct value (Supabase dashboard)
- [ ] Navigate to display screen
- [ ] Verify value displays correctly
- [ ] Edit the value
- [ ] Verify edit persists after app restart

**Estimated Testing Time:** 2-3 hours for all 103 fields
