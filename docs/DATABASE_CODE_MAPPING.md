# 🗄️ Database-to-Code Complete Mapping Reference

**Purpose**: Quick reference for field mappings between Database, TypeScript, and UI components

📖 **Main Audit Report**: [ONBOARDING_AUDIT_COMPLETE.md](./ONBOARDING_AUDIT_COMPLETE.md) - Issues, priorities, and fixes

---

## 📋 TAB 1: PERSONAL INFO

### **Database: `profiles` table**
| DB Column | Type | TypeScript Field | UI Component | Notes |
|-----------|------|------------------|--------------|-------|
| `first_name` | TEXT | `first_name` | PersonalInfoTab.tsx:272 | Required |
| `last_name` | TEXT | `last_name` | PersonalInfoTab.tsx:282 | Required |
| `age` | INTEGER | `age` | PersonalInfoTab.tsx:289 | Range: 13-120 |
| `gender` | TEXT | `gender` | PersonalInfoTab.tsx:303 | Enum: male/female/other/prefer_not_to_say |
| `country` | TEXT | `country` | PersonalInfoTab.tsx:343 | Required, dropdown |
| `state` | TEXT | `state` | PersonalInfoTab.tsx:378 | Required, depends on country |
| `region` | TEXT | `region` | PersonalInfoTab.tsx:413 | Optional |
| `wake_time` | TIME | `wake_time` | PersonalInfoTab.tsx:475 | Format: HH:MM |
| `sleep_time` | TIME | `sleep_time` | PersonalInfoTab.tsx:487 | Format: HH:MM |
| `height_cm` | INTEGER | `height_cm` | - | ❌ DUPLICATE - Should only be in body_analysis |
| `weight_kg` | NUMERIC | `weight_kg` | - | ❌ DUPLICATE - Should only be in body_analysis |
| `activity_level` | TEXT | `activity_level` | - | ❌ DUPLICATE - Should only be in workout_preferences |

**TypeScript Interface**: `PersonalInfoData` (src/types/onboarding.ts:7-33)

---

## 📋 TAB 2: DIET PREFERENCES

### **Database: `diet_preferences` table**
| DB Column | Type | TypeScript Field | UI Component | Notes |
|-----------|------|------------------|--------------|-------|
| `diet_type` | TEXT | `diet_type` | DietPreferencesTab.tsx:481 | Enum: vegetarian/vegan/non-veg/pescatarian |
| `allergies` | TEXT[] | `allergies` | DietPreferencesTab.tsx:854 | Array, multi-select |
| `cuisine_preferences` | TEXT[] | `cuisine_preferences` | DietPreferencesTab.tsx:878 | Array, multi-select, required |
| `restrictions` | TEXT[] | `restrictions` | DietPreferencesTab.tsx:902 | Array, multi-select |
| **Diet Readiness (6 fields)** ||||
| `keto_ready` | BOOLEAN | `keto_ready` | DietPreferencesTab.tsx:519 | Toggle |
| `intermittent_fasting_ready` | BOOLEAN | `intermittent_fasting_ready` | DietPreferencesTab.tsx:519 | Toggle |
| `paleo_ready` | BOOLEAN | `paleo_ready` | DietPreferencesTab.tsx:519 | Toggle |
| `mediterranean_ready` | BOOLEAN | `mediterranean_ready` | DietPreferencesTab.tsx:519 | Toggle |
| `low_carb_ready` | BOOLEAN | `low_carb_ready` | DietPreferencesTab.tsx:519 | Toggle |
| `high_protein_ready` | BOOLEAN | `high_protein_ready` | DietPreferencesTab.tsx:519 | Toggle |
| **Meal Preferences (4 fields)** ||||
| `breakfast_enabled` | BOOLEAN | `breakfast_enabled` | DietPreferencesTab.tsx:619 | Default: true |
| `lunch_enabled` | BOOLEAN | `lunch_enabled` | DietPreferencesTab.tsx:619 | Default: true |
| `dinner_enabled` | BOOLEAN | `dinner_enabled` | DietPreferencesTab.tsx:619 | Default: true |
| `snacks_enabled` | BOOLEAN | `snacks_enabled` | DietPreferencesTab.tsx:619 | Default: true |
| **Cooking Preferences (3 fields)** ||||
| `cooking_skill_level` | TEXT | `cooking_skill_level` | DietPreferencesTab.tsx:708 | ❌ MISSING 'not_applicable' in constraint |
| `max_prep_time_minutes` | INTEGER | `max_prep_time_minutes` | DietPreferencesTab.tsx:764 | Range: 5-180, ❌ should allow NULL |
| `budget_level` | TEXT | `budget_level` | DietPreferencesTab.tsx:789 | Enum: low/medium/high |
| **Health Habits (14 boolean fields)** ||||
| `drinks_enough_water` | BOOLEAN | `drinks_enough_water` | DietPreferencesTab.tsx:932 | Toggle |
| `limits_sugary_drinks` | BOOLEAN | `limits_sugary_drinks` | DietPreferencesTab.tsx:932 | Toggle |
| `eats_regular_meals` | BOOLEAN | `eats_regular_meals` | DietPreferencesTab.tsx:932 | Toggle |
| `avoids_late_night_eating` | BOOLEAN | `avoids_late_night_eating` | DietPreferencesTab.tsx:932 | Toggle |
| `controls_portion_sizes` | BOOLEAN | `controls_portion_sizes` | DietPreferencesTab.tsx:932 | Toggle |
| `reads_nutrition_labels` | BOOLEAN | `reads_nutrition_labels` | DietPreferencesTab.tsx:932 | Toggle |
| `eats_processed_foods` | BOOLEAN | `eats_processed_foods` | DietPreferencesTab.tsx:932 | Toggle |
| `eats_5_servings_fruits_veggies` | BOOLEAN | `eats_5_servings_fruits_veggies` | DietPreferencesTab.tsx:932 | Toggle |
| `limits_refined_sugar` | BOOLEAN | `limits_refined_sugar` | DietPreferencesTab.tsx:932 | Toggle |
| `includes_healthy_fats` | BOOLEAN | `includes_healthy_fats` | DietPreferencesTab.tsx:932 | Toggle |
| `drinks_alcohol` | BOOLEAN | `drinks_alcohol` | DietPreferencesTab.tsx:932 | Toggle |
| `smokes_tobacco` | BOOLEAN | `smokes_tobacco` | DietPreferencesTab.tsx:932 | Toggle |
| `drinks_coffee` | BOOLEAN | `drinks_coffee` | DietPreferencesTab.tsx:932 | Toggle |
| `takes_supplements` | BOOLEAN | `takes_supplements` | DietPreferencesTab.tsx:932 | Toggle |

**TypeScript Interface**: `DietPreferencesData` (src/types/onboarding.ts:38-79)

---

## 📋 TAB 3: BODY ANALYSIS

### **Database: `body_analysis` table**
| DB Column | Type | TypeScript Field | UI Component | Notes |
|-----------|------|------------------|--------------|-------|
| **Basic Measurements (Required)** ||||
| `height_cm` | NUMERIC(5,2) | `height_cm` | BodyAnalysisTab.tsx:358 | Range: 100-250, ❌ INTEGER in profiles |
| `current_weight_kg` | NUMERIC(5,2) | `current_weight_kg` | BodyAnalysisTab.tsx:369 | Range: 30-300 |
| `target_weight_kg` | NUMERIC(5,2) | `target_weight_kg` | BodyAnalysisTab.tsx:380 | Range: 30-300 |
| `target_timeline_weeks` | INTEGER | `target_timeline_weeks` | BodyAnalysisTab.tsx:391 | Range: 4-104 |
| **Body Composition (Optional)** ||||
| `body_fat_percentage` | NUMERIC(4,2) | `body_fat_percentage` | BodyAnalysisTab.tsx:477 | Range: 3-50 |
| `waist_cm` | NUMERIC(5,2) | `waist_cm` | BodyAnalysisTab.tsx:488 | Optional |
| `hip_cm` | NUMERIC(5,2) | `hip_cm` | BodyAnalysisTab.tsx:499 | Optional |
| `chest_cm` | NUMERIC(5,2) | `chest_cm` | BodyAnalysisTab.tsx:510 | Optional |
| **Photos (Individual URLs)** ||||
| `front_photo_url` | TEXT | `front_photo_url` | BodyAnalysisTab.tsx:546 | URL string |
| `side_photo_url` | TEXT | `side_photo_url` | BodyAnalysisTab.tsx:546 | URL string |
| `back_photo_url` | TEXT | `back_photo_url` | BodyAnalysisTab.tsx:546 | URL string |
| **AI Analysis** ||||
| `ai_estimated_body_fat` | NUMERIC(4,2) | `ai_estimated_body_fat` | BodyAnalysisTab.tsx:590 | Auto-populated |
| `ai_body_type` | TEXT | `ai_body_type` | BodyAnalysisTab.tsx:590 | Enum: ectomorph/mesomorph/endomorph |
| `ai_confidence_score` | INTEGER | `ai_confidence_score` | BodyAnalysisTab.tsx:590 | Range: 0-100 |
| **Medical Info** ||||
| `medical_conditions` | TEXT[] | `medical_conditions` | BodyAnalysisTab.tsx:652 | Array |
| `medications` | TEXT[] | `medications` | BodyAnalysisTab.tsx:671 | Array |
| `physical_limitations` | TEXT[] | `physical_limitations` | BodyAnalysisTab.tsx:690 | Array |
| **Calculated Values** ||||
| `bmi` | NUMERIC(4,2) | `bmi` | BodyAnalysisTab.tsx:726 | Auto-calculated |
| `bmr` | NUMERIC(7,2) | `bmr` | BodyAnalysisTab.tsx:734 | ❌ Hardcoded age=25 |
| `ideal_weight_min` | NUMERIC(5,2) | `ideal_weight_min` | - | ❌ No gender in formula |
| `ideal_weight_max` | NUMERIC(5,2) | `ideal_weight_max` | - | ❌ No gender in formula |
| `waist_hip_ratio` | NUMERIC(3,2) | `waist_hip_ratio` | BodyAnalysisTab.tsx:742 | Auto-calculated |

**TypeScript Interface**: `BodyAnalysisData` (src/types/onboarding.ts:117-165)

---

## 📋 TAB 4: WORKOUT PREFERENCES

### **Database: `workout_preferences` table**
| DB Column | Type | TypeScript Field | UI Component | Notes |
|-----------|------|------------------|--------------|-------|
| **Basic Preferences** ||||
| `location` | TEXT | `location` | WorkoutPreferencesTab.tsx:496 | Enum: home/gym/both |
| `equipment` | TEXT[] | `equipment` | WorkoutPreferencesTab.tsx:527 | Array, multi-select |
| `time_preference` | INTEGER | `time_preference` | WorkoutPreferencesTab.tsx:547 | Minutes: 15-120 |
| `intensity` | TEXT | `intensity` | WorkoutPreferencesTab.tsx:566 | Enum: beginner/intermediate/advanced |
| `workout_types` | TEXT[] | `workout_types` | WorkoutPreferencesTab.tsx:596 | Array, multi-select |
| **Goals & Activity** ||||
| `primary_goals` | TEXT[] | `primary_goals` | WorkoutPreferencesTab.tsx:287 | Array, required |
| `activity_level` | TEXT | `activity_level` | WorkoutPreferencesTab.tsx:324 | ❌ DUPLICATE in profiles |
| **Fitness Assessment** ||||
| `workout_experience_years` | INTEGER | `workout_experience_years` | WorkoutPreferencesTab.tsx:371 | Range: 0-50 |
| `workout_frequency_per_week` | INTEGER | `workout_frequency_per_week` | WorkoutPreferencesTab.tsx:394 | Range: 0-7 |
| `can_do_pushups` | INTEGER | `can_do_pushups` | WorkoutPreferencesTab.tsx:417 | Range: 0-200 |
| `can_run_minutes` | INTEGER | `can_run_minutes` | WorkoutPreferencesTab.tsx:440 | Range: 0-300 |
| `flexibility_level` | TEXT | `flexibility_level` | WorkoutPreferencesTab.tsx:459 | Enum: poor/fair/good/excellent |
| **Weight Goals** ||||
| `weekly_weight_loss_goal` | NUMERIC(3,2) | `weekly_weight_loss_goal` | WorkoutPreferencesTab.tsx:740 | Auto-populated |
| **Preferences** ||||
| `preferred_workout_times` | TEXT[] | `preferred_workout_times` | WorkoutPreferencesTab.tsx:617 | Array: morning/afternoon/evening |
| `enjoys_cardio` | BOOLEAN | `enjoys_cardio` | WorkoutPreferencesTab.tsx:660 | ❌ NOT RENDERED |
| `enjoys_strength_training` | BOOLEAN | `enjoys_strength_training` | WorkoutPreferencesTab.tsx:660 | ❌ NOT RENDERED |
| `enjoys_group_classes` | BOOLEAN | `enjoys_group_classes` | WorkoutPreferencesTab.tsx:660 | ❌ NOT RENDERED |
| `prefers_outdoor_activities` | BOOLEAN | `prefers_outdoor_activities` | WorkoutPreferencesTab.tsx:660 | ❌ NOT RENDERED |
| `needs_motivation` | BOOLEAN | `needs_motivation` | WorkoutPreferencesTab.tsx:660 | ❌ NOT RENDERED |
| `prefers_variety` | BOOLEAN | `prefers_variety` | WorkoutPreferencesTab.tsx:660 | ❌ NOT RENDERED |

**TypeScript Interface**: `WorkoutPreferencesData` (src/types/onboarding.ts:170-200)

---

## 📋 TAB 5: ADVANCED REVIEW (All Calculated)

### **Database: `advanced_review` table**
| DB Column | Type | Formula Location | Notes |
|-----------|------|------------------|-------|
| **Metabolic** ||||
| `calculated_bmi` | NUMERIC(4,2) | healthCalculations.ts:22 | ✅ Correct |
| `calculated_bmr` | NUMERIC(7,2) | healthCalculations.ts:31 | ✅ Has gender |
| `calculated_tdee` | NUMERIC(7,2) | healthCalculations.ts:40 | ✅ Correct |
| `metabolic_age` | INTEGER | healthCalculations.ts:56 | ⚠️ Rough approx |
| **Nutrition** ||||
| `daily_calories` | INTEGER | healthCalculations.ts:76 | ✅ Correct |
| `daily_protein_g` | INTEGER | healthCalculations.ts:91 | ✅ Correct |
| `daily_carbs_g` | INTEGER | healthCalculations.ts:91 | ✅ Correct |
| `daily_fat_g` | INTEGER | healthCalculations.ts:91 | ✅ Correct |
| `daily_water_ml` | INTEGER | healthCalculations.ts:143 | ✅ Correct |
| `daily_fiber_g` | INTEGER | healthCalculations.ts:152 | ✅ Correct |
| **Weight Management** ||||
| `healthy_weight_min` | NUMERIC(5,2) | healthCalculations.ts:160 | ❌ NO GENDER |
| `healthy_weight_max` | NUMERIC(5,2) | healthCalculations.ts:160 | ❌ NO GENDER |
| `weekly_weight_loss_rate` | NUMERIC(3,2) | healthCalculations.ts:172 | ❌ NO GENDER |
| `estimated_timeline_weeks` | INTEGER | Calculated | ✅ Correct |
| `total_calorie_deficit` | INTEGER | Calculated | ✅ Correct |
| **Body Composition** ||||
| `ideal_body_fat_min` | NUMERIC(4,2) | healthCalculations.ts:182 | ✅ Has gender |
| `ideal_body_fat_max` | NUMERIC(5,2) | healthCalculations.ts:182 | ✅ Has gender |
| `lean_body_mass` | NUMERIC(5,2) | healthCalculations.ts:207 | ✅ Correct |
| `fat_mass` | NUMERIC(5,2) | healthCalculations.ts:207 | ✅ Correct |
| **Fitness** ||||
| `estimated_vo2_max` | NUMERIC(4,1) | healthCalculations.ts:269 | ⚠️ Age bug <20 |
| `target_hr_fat_burn_min` | INTEGER | healthCalculations.ts:244 | ✅ Correct |
| `target_hr_fat_burn_max` | INTEGER | healthCalculations.ts:244 | ✅ Correct |
| `target_hr_cardio_min` | INTEGER | healthCalculations.ts:244 | ✅ Correct |
| `target_hr_cardio_max` | INTEGER | healthCalculations.ts:244 | ✅ Correct |
| `target_hr_peak_min` | INTEGER | healthCalculations.ts:244 | ✅ Correct |
| `target_hr_peak_max` | INTEGER | healthCalculations.ts:244 | ✅ Correct |
| `recommended_workout_frequency` | INTEGER | healthCalculations.ts:288 | ✅ Correct |
| `recommended_cardio_minutes` | INTEGER | healthCalculations.ts:316 | ✅ Correct |
| `recommended_strength_sessions` | INTEGER | healthCalculations.ts:329 | ✅ Correct |
| **Health Scores (0-100)** ||||
| `overall_health_score` | INTEGER | healthCalculations.ts:344+ | ✅ Correct |
| `diet_readiness_score` | INTEGER | healthCalculations.ts:344+ | ✅ Correct |
| `fitness_readiness_score` | INTEGER | healthCalculations.ts:344+ | ✅ Correct |
| `goal_realistic_score` | INTEGER | healthCalculations.ts:344+ | ✅ Correct |
| **Sleep** ||||
| `recommended_sleep_hours` | NUMERIC(3,1) | Calculated from age | ✅ Correct |
| `current_sleep_duration` | NUMERIC(3,1) | From wake/sleep times | ✅ Correct |
| `sleep_efficiency_score` | INTEGER | Calculated | ✅ Correct |
| **Meta** ||||
| `data_completeness_percentage` | INTEGER | AdvancedReviewTab.tsx:166 | ✅ Correct |
| `reliability_score` | INTEGER | AdvancedReviewTab.tsx:177 | ✅ Correct |
| `personalization_level` | INTEGER | AdvancedReviewTab.tsx:168 | ✅ Correct |

**TypeScript Interface**: `AdvancedReviewData` (src/types/onboarding.ts:205-260)

---

## 🔗 CROSS-TAB DEPENDENCIES

```
Tab 1 (Personal Info)
  ↓ age, gender
Tab 3 (Body Analysis) → BMR calculation ❌ NOT PASSED!
  ↓ current_weight_kg, target_weight_kg, target_timeline_weeks
Tab 4 (Workout) → Weekly weight loss goal ✅ Auto-populated
  ↓ ALL DATA
Tab 5 (Advanced Review) → All calculations ✅ Receives all tabs
```

---

## 📝 QUICK FIX REFERENCE

### **Database Migrations Needed**:
```sql
-- Fix #8: Add 'not_applicable' to cooking_skill
ALTER TABLE diet_preferences DROP CONSTRAINT check_cooking_skill_level;
ALTER TABLE diet_preferences ADD CONSTRAINT check_cooking_skill_level 
  CHECK (cooking_skill_level = ANY (ARRAY['beginner', 'intermediate', 'advanced', 'not_applicable']));

-- Fix #9: Allow NULL for prep_time
ALTER TABLE diet_preferences DROP CONSTRAINT check_prep_time_range;
ALTER TABLE diet_preferences ADD CONSTRAINT check_prep_time_range 
  CHECK (max_prep_time_minutes IS NULL OR (max_prep_time_minutes >= 5 AND max_prep_time_minutes <= 180));

-- Fix #6: Standardize height_cm type
ALTER TABLE profiles ALTER COLUMN height_cm TYPE NUMERIC(5,2);

-- Fix #7: Remove activity_level duplicate
-- (Requires data migration first!)
ALTER TABLE profiles DROP COLUMN activity_level;
```

### **Code Changes Needed**:
```typescript
// Fix #2 & #13: Pass personalInfo to BodyAnalysisTab
interface BodyAnalysisTabProps {
  data: BodyAnalysisData | null;
  personalInfoData?: PersonalInfoData | null; // ADD THIS
}

// Fix #1: Update calculateIdealWeightRange
static calculateIdealWeightRange(
  heightCm: number, 
  gender: string,  // ADD THIS
  age: number      // ADD THIS
): { min: number; max: number }

// Fix #12: Add missing render
{renderWorkoutStyleSection()} // ADD at line 776
```

---

**END OF MAPPING REFERENCE**
