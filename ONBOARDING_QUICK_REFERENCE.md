# ONBOARDING FIELD MAPPING - QUICK REFERENCE

**One-page cheat sheet for developers**

---

## FIELD COUNT SUMMARY

| Tab | UI Inputs | DB Columns | Auto-Computed | Auto-Populated | Total |
|-----|-----------|-----------|--------------|----------------|-------|
| Tab 1: Personal Info | 11 | 11 | 1 (name) | 0 | 12 |
| Tab 2: Diet Preferences | 30 | 30 | 0 | 0 | 30 |
| Tab 3: Body Analysis | 21 | 26 | 5 | 0 | 26 |
| Tab 4: Workout Preferences | 20 | 20 | 0 | 3 | 20 |
| Tab 5: Advanced Review | 0 | 44 | 44 | 0 | 44 |
| **TOTAL** | **82** | **131** | **50** | **3** | **132** |

---

## KEY TYPE FIXES

### Fixed Issues
```typescript
// ❌ OLD (WRONG):
interface PersonalInfo {
  age: string;              // Wrong type
  height: string;           // Wrong location
  weight: string;           // Wrong location
}

// ✅ NEW (CORRECT):
interface PersonalInfo {
  age: number;              // Fixed type
  // height/weight moved to BodyMetrics
}

interface BodyMetrics {
  height_cm: number;        // Correct location
  current_weight_kg: number;// Correct location
}
```

---

## AUTO-POPULATION RULES

### 1. Equipment (Tab 4)
```typescript
IF location === 'gym' AND equipment.length === 0
THEN equipment = ['bodyweight', 'dumbbells', 'barbell', 'kettlebells',
                  'pull-up-bar', 'treadmill', 'stationary-bike', 'yoga-mat']
```

### 2. Activity Level (Tab 4)
```typescript
MAPPING: occupation_type (Tab 1) → activity_level (Tab 4)
{
  desk_job: 'sedentary',
  light_active: 'light',
  moderate_active: 'moderate',
  heavy_labor: 'active',
  very_active: 'extreme'
}
```

### 3. Weekly Weight Loss (Tab 4)
```typescript
IF current_weight_kg AND target_weight_kg AND target_timeline_weeks
THEN weekly_weight_loss_goal = min(1.0, abs(current - target) / timeline)
```

---

## COMPUTED FIELDS

### Tab 1: Personal Info
```typescript
name = `${first_name} ${last_name}`.trim()
```

### Tab 3: Body Analysis
```typescript
bmi = current_weight_kg / (height_cm / 100)²
bmr = Mifflin-St Jeor(weight, height, age, gender)
ideal_weight_min = BMI_18.5 × height²
ideal_weight_max = BMI_24.9 × height²
waist_hip_ratio = waist_cm / hip_cm
```

### Tab 5: Advanced Review (44 fields)
```typescript
// Metabolic
calculated_bmr = Mifflin-St Jeor equation
calculated_tdee = BMR × activity_multiplier
daily_calories = TDEE - deficit

// Macros
daily_protein_g = weight × protein_ratio
daily_fat_g = calories × fat_percentage
daily_carbs_g = (calories - protein - fat) / 4

// Hydration
daily_water_ml = weight × 35

// Heart Rate Zones
max_hr = 220 - age
fat_burn_min = max_hr × 0.6
fat_burn_max = max_hr × 0.7
cardio_min = max_hr × 0.7
cardio_max = max_hr × 0.85
```

---

## CRITICAL VALIDATION RULES

### Tab 1
```typescript
REQUIRED: first_name, last_name, age, gender, country, state, occupation_type, wake_time, sleep_time
RANGE: age (13-120)
```

### Tab 2
```typescript
REQUIRED: diet_type
CONSTRAINT: At least 1 meal enabled (breakfast OR lunch OR dinner OR snacks)
```

### Tab 3
```typescript
MINIMUM: height_cm OR current_weight_kg (at least one)
RANGE: height_cm (100-250), weight (30-300), timeline (4-104)
CRITICAL: pregnancy_status, breastfeeding_status (affects calorie deficit)
```

### Tab 4
```typescript
REQUIRED: location, intensity, activity_level, primary_goals (≥1)
```

### Tab 5
```typescript
VALIDATION ENGINE: Checks all tabs
SAFETY: Pregnancy limits deficit to max 200 kcal
REALISM: Weekly loss rate max 1.5 kg/week
```

---

## TRANSFORMATION PATTERNS

### Null ↔ Undefined
```typescript
// DB → TypeScript
region: data.region === null ? undefined : data.region

// TypeScript → DB
region: data.region || null
```

### Time Format
```typescript
// Storage: "HH:MM" (24-hour)
wake_time: "07:00"

// Display: "7:00 AM" (12-hour)
formatTimeForDisplay("07:00") → "7:00 AM"
```

### Arrays
```typescript
// Always default to empty array
allergies: data?.allergies || []
```

---

## DATABASE TABLES

### profiles (Tab 1)
```sql
id (PK), first_name, last_name, name, age (INTEGER), gender,
country, state, region, wake_time (TIME), sleep_time (TIME),
occupation_type, created_at, updated_at
```

### diet_preferences (Tab 2)
```sql
user_id (PK/FK), diet_type, allergies (TEXT[]), restrictions (TEXT[]),
keto_ready, IF_ready, paleo_ready, mediterranean_ready, low_carb_ready, high_protein_ready,
breakfast_enabled, lunch_enabled, dinner_enabled, snacks_enabled,
cooking_skill_level, max_prep_time_minutes, budget_level,
drinks_enough_water, ...(14 health habit booleans),
created_at, updated_at
```

### body_analysis (Tab 3)
```sql
user_id (PK/FK), height_cm (DECIMAL), current_weight_kg, target_weight_kg, target_timeline_weeks,
body_fat_percentage, waist_cm, hip_cm, chest_cm,
front_photo_url, side_photo_url, back_photo_url,
ai_estimated_body_fat, ai_body_type, ai_confidence_score,
medical_conditions (TEXT[]), medications (TEXT[]), physical_limitations (TEXT[]),
pregnancy_status, pregnancy_trimester, breastfeeding_status, stress_level,
bmi, bmr, ideal_weight_min, ideal_weight_max, waist_hip_ratio,
created_at, updated_at
```

### workout_preferences (Tab 4)
```sql
user_id (PK/FK), location, equipment (TEXT[]), time_preference, intensity,
workout_types (TEXT[]), primary_goals (TEXT[]), activity_level,
workout_experience_years, workout_frequency_per_week, can_do_pushups, can_run_minutes, flexibility_level,
weekly_weight_loss_goal, preferred_workout_times (TEXT[]),
enjoys_cardio, enjoys_strength_training, enjoys_group_classes, prefers_outdoor_activities,
needs_motivation, prefers_variety,
created_at, updated_at
```

### advanced_review (Tab 5)
```sql
user_id (PK/FK),
calculated_bmi, calculated_bmr, calculated_tdee, metabolic_age,
daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g, daily_water_ml, daily_fiber_g,
healthy_weight_min, healthy_weight_max, weekly_weight_loss_rate, estimated_timeline_weeks, total_calorie_deficit,
ideal_body_fat_min, ideal_body_fat_max, lean_body_mass, fat_mass,
estimated_vo2_max, target_hr_fat_burn_min/max, target_hr_cardio_min/max, target_hr_peak_min/max,
recommended_workout_frequency, recommended_cardio_minutes, recommended_strength_sessions,
overall_health_score, diet_readiness_score, fitness_readiness_score, goal_realistic_score,
recommended_sleep_hours, current_sleep_duration, sleep_efficiency_score,
data_completeness_percentage, reliability_score, personalization_level,
validation_status, validation_errors (JSONB), validation_warnings (JSONB),
refeed_schedule (JSONB), medical_adjustments (TEXT[]),
created_at, updated_at
```

---

## SERVICE METHODS

### Save Pattern
```typescript
// All tabs follow this pattern
TabService.save(userId: string, data: TabData): Promise<boolean>
```

### Load Pattern
```typescript
// All tabs follow this pattern
TabService.load(userId: string): Promise<TabData | null>
```

### Available Services
```typescript
PersonalInfoService.save() / .load() / .delete()
DietPreferencesService.save() / .load()
BodyAnalysisService.save() / .load()
WorkoutPreferencesService.save() / .load()
AdvancedReviewService.save() / .load()
OnboardingProgressService.save() / .load() / .markComplete()
```

---

## CALCULATION ENGINES

### HealthCalculationEngine
```typescript
calculateAllMetrics(personalInfo, dietPrefs, bodyAnalysis, workoutPrefs)
→ Returns: AdvancedReviewData (44 fields)
```

### ValidationEngine
```typescript
validateUserPlan(personalInfo, dietPrefs, bodyAnalysis, workoutPrefs)
→ Returns: ValidationResults {
  canProceed: boolean,
  hasErrors: boolean,
  hasWarnings: boolean,
  errors: string[],
  warnings: string[],
  calculatedMetrics: {...},
  adjustments: {...}
}
```

### MetabolicCalculations
```typescript
calculateBMR(weight, height, age, gender)
calculateTDEE(bmr, activityLevel)
calculateWaterIntake(weight)
calculateFiber(calories)
calculateDietReadinessScore(dietPrefs)
```

---

## DISPLAY LOCATIONS

### Profile Screen
```typescript
name, age, gender, height_cm, current_weight_kg, bmi, country
```

### Diet Screen
```typescript
diet_type, daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g,
breakfast_enabled, lunch_enabled, dinner_enabled, snacks_enabled
```

### Fitness Screen
```typescript
intensity, location, primary_goals, workout_frequency_per_week, time_preference
```

### Progress Screen
```typescript
current_weight_kg, target_weight_kg, weekly_weight_loss_rate,
estimated_timeline_weeks, calculated_bmi, calculated_tdee
```

### Analytics Screen
```typescript
All 44 metrics from advanced_review table
```

---

## COMMON TASKS

### Add New Field to Tab 1
1. Add to `PersonalInfoData` type (src/types/onboarding.ts)
2. Add to UI component (src/screens/onboarding/tabs/PersonalInfoTab.tsx)
3. Add to database migration (create new migration file)
4. Add to `ProfilesRow` type (src/types/onboarding.ts)
5. Update `PersonalInfoService.save()` mapping
6. Update `PersonalInfoService.load()` mapping
7. Update validation logic in `OnboardingUtils.validatePersonalInfo()`

### Add Computed Field to Tab 5
1. Add to `AdvancedReviewData` type (src/types/onboarding.ts)
2. Add calculation logic to `HealthCalculationEngine.calculateAllMetrics()`
3. Add to database migration (if storing)
4. Add to display component (AdvancedReviewTab.tsx)

### Fix Type Mismatch
1. Check database schema (supabase/migrations/*.sql)
2. Update TypeScript type (src/types/onboarding.ts)
3. Verify service transformation (src/services/onboardingService.ts)
4. Test save/load cycle

---

## TROUBLESHOOTING

### Field Not Saving
```typescript
// Check save transformation
console.log('💾 [DB-SERVICE] Input data:', data);
console.log('💾 [DB-SERVICE] Transformed data:', transformedData);

// Check database column name matches
// Check type compatibility (string vs number, null vs undefined)
```

### Field Not Loading
```typescript
// Check load transformation
console.log('📥 [DB-SERVICE] Raw data from database:', data);
console.log('✅ [DB-SERVICE] Transformed data:', transformedData);

// Check null → undefined conversion
// Check array defaults ([] not null)
```

### Validation Not Working
```typescript
// Check validation result
console.log('🔍 [VALIDATION] Result:', validationResult);

// Check field name matching in error detection
// Check validation logic in OnboardingUtils
```

---

## FILE LOCATIONS

### Type Definitions
- `src/types/onboarding.ts` - Tab-specific data types
- `src/types/user.ts` - User/profile types
- `src/types/profileData.ts` - Profile data with sync metadata

### UI Components
- `src/screens/onboarding/tabs/PersonalInfoTab.tsx`
- `src/screens/onboarding/tabs/DietPreferencesTab.tsx`
- `src/screens/onboarding/tabs/BodyAnalysisTab.tsx`
- `src/screens/onboarding/tabs/WorkoutPreferencesTab.tsx`
- `src/screens/onboarding/tabs/AdvancedReviewTab.tsx`

### Services
- `src/services/onboardingService.ts` - All tab services
- `src/services/validationEngine.ts` - Cross-tab validation
- `src/utils/healthCalculations.ts` - Calculation engines

### Database
- `supabase/migrations/20250119000000_create_onboarding_tables.sql`

---

## QUICK COMMANDS

### Check Field Mapping
```bash
# Find field usage in UI
grep -r "field_name" src/screens/onboarding/tabs/

# Find field in types
grep -r "field_name" src/types/

# Find field in database
grep -r "field_name" supabase/migrations/
```

### Verify Type Consistency
```bash
# Compare TypeScript type to database schema
# 1. Check src/types/onboarding.ts
# 2. Check supabase/migrations/20250119000000_create_onboarding_tables.sql
```

---

## REFERENCE DOCUMENTS

For complete details, see:
- `ONBOARDING_FIELD_MAPPING_COMPLETE.md` - Full field-by-field mapping
- `ONBOARDING_DATA_FLOW.md` - Visual data flow diagrams
- `COMPLETE_FIELD_MAPPING.md` - Original field mapping (legacy)

---

**Quick Reference Version:** 1.0
**Last Updated:** 2025-12-29
**Status:** Complete ✅
