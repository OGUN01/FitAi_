# TS2339 Error Fixes Summary

## Errors Fixed: 36 (from 123 to 87)

### Category 1: Theme/Spacing Fixes ✅ COMPLETED
**Changes Made:**
- Added `xxs: 2` and `xs: 2` to spacing system
- Added `xs: 2` to borderRadius system
- Added `textTertiary: '#6a6a6a'` to text colors
- Added `primaryFaded: 'rgba(99, 102, 241, 0.3)'` to colors

**Files Modified:**
- `src/theme/aurora-tokens.ts`
- `src/utils/constants.ts`

**Errors Fixed:**
- primaryFaded color issues
- textTertiary color issues  
- xs/xxs spacing issues

### Category 2: Food/Diet Type Fixes ✅ COMPLETED
**Changes Made:**
- Added `confidence` to FoodRecognitionResult
- Added `data` alias to FoodRecognitionResult
- Added `portionSize` and `enhancementSource` to RecognizedFood
- Added `sugar` and `sodium` to Macronutrients
- Added `total_carbohydrates` and `timing` to Meal type

**Files Modified:**
- `src/types/diet.ts`

**Errors Fixed:**
- FoodRecognitionResult.confidence
- RecognizedFood.portionSize
- RecognizedFood.enhancementSource
- Macronutrients.sugar
- Macronutrients.sodium
- Meal.total_carbohydrates
- Meal.timing

### Category 3: Workout Type Fixes ✅ COMPLETED
**Changes Made:**
- Added `isRestDay` and `completed` to Workout type
- Added `duration` to WeeklyWorkoutPlan type
- Added `timing` to DayMeal type

**Files Modified:**
- `src/types/workout.ts`
- `src/types/ai.ts`

**Errors Fixed:**
- Workout.isRestDay
- Workout.completed
- WeeklyWorkoutPlan.duration
- DayMeal.timing

### Category 4: User/Profile Type Fixes ✅ COMPLETED
**Changes Made:**
- Added `achievements` to UserProfile.stats
- Added `prefers_variety` to WorkoutPreferences

**Files Modified:**
- `src/types/user.ts`

**Errors Fixed:**
- UserProfile.stats.achievements
- WorkoutPreferences.prefers_variety

### Category 5: Onboarding Type Fixes ✅ COMPLETED
**Changes Made:**
- Added missing fields to AdvancedReviewData (max_heart_rate, bmi_category, etc.)
- Added `session_duration_minutes` and `available_equipment` to WorkoutPreferencesData
- Added `cuisine_preferences` and `snacks_count` to DietPreferencesData

**Files Modified:**
- `src/types/onboarding.ts`

**Errors Fixed:**
- AdvancedReviewData.max_heart_rate
- AdvancedReviewData.bmi_category
- AdvancedReviewData.bmi_health_risk
- AdvancedReviewData.detected_climate
- AdvancedReviewData.detected_ethnicity
- AdvancedReviewData.bmr_formula_used
- AdvancedReviewData.health_score
- AdvancedReviewData.health_grade
- AdvancedReviewData.vo2_max_estimate
- AdvancedReviewData.vo2_max_classification
- AdvancedReviewData.heart_rate_zones
- WorkoutPreferencesData.session_duration_minutes
- WorkoutPreferencesData.available_equipment
- DietPreferencesData.cuisine_preferences
- DietPreferencesData.snacks_count

## Remaining Errors: 87

### Category 1: Style/UI Object Types (42 errors)
These errors occur when accessing properties on inline style objects that don't have explicit type definitions.

**Affected Files:**
- `src/components/form/PeriodSelector.tsx` - buttonWrapper
- `src/components/ui/Card.tsx` - children property
- `src/components/ui/CustomDialog.tsx` - stats* properties (statsContainer, statsTitle, etc.)
- `src/components/diet/PortionAdjustment.tsx` - nutrition object without sugar/sodium
- `src/screens/onboarding/tabs/BodyAnalysisTab.tsx` - stressSlider style

**Recommendation:** These require:
1. Creating explicit type definitions for style objects
2. OR using inline type assertions where appropriate
3. OR fixing the component to match actual style definitions

### Category 2: Service/Utility Type Issues (25 errors)
**Affected Files:**
- `src/services/migration.ts` - DataTransformationService methods
- `src/services/migrationManager.ts` - MigrationResult properties
- `src/services/auth.ts` - Migration result properties
- `src/services/trackIntegrationService.ts` - Return type issues
- `src/services/userMetricsService.ts` - Already fixed in AdvancedReviewData
- `src/services/foodRecognitionFeedbackService.ts` - Already fixed in RecognizedFood
- `src/utils/healthCalculations/` - MuscleGainLimits and GoalValidation types
- `src/theme/gluestack-ui.config.ts` - theme property

**Recommendation:** These require examining the actual service implementations and adding missing type properties.

### Category 3: Component-Specific Issues (15 errors)
**Affected Files:**
- `src/screens/main/ProfileScreen.tsx` - BodyMetrics height/weight (should use height_cm/current_weight_kg)
- `src/screens/main/ProgressScreen.tsx` - CalculatedMetrics.ideal_body_fat_max
- `src/screens/main/DietScreen.tsx` - specialAction, Reanimated Value._value
- `src/screens/details/MealDetail.tsx` - UseCalculatedMetricsReturn.dailyCalories
- `src/screens/analytics/AnalyticsScreen.tsx` - emoji property
- `src/screens/onboarding/FitnessGoalsScreen.tsx` - color object properties
- `src/screens/onboarding/PersonalInfoScreen.tsx` - trim() on numbers
- `src/screens/profile/ProfileScreen.tsx` - haptics.impact()

**Recommendation:** These are mostly one-off fixes in specific components.

### Category 4: Library/External Type Issues (5 errors)
- Reanimated Value._value access
- Haptics.impact() method
- Integration utils

**Recommendation:** May need type declarations or workarounds for library issues.

## Next Steps

To fix the remaining 87 errors, prioritize in this order:

1. **Fix BodyMetrics property access** (high priority - affects user data)
   - Change `bodyMetrics.height` → `bodyMetrics.height_cm`
   - Change `bodyMetrics.weight` → `bodyMetrics.current_weight_kg`

2. **Add missing service type definitions** (medium priority)
   - MigrationResult type
   - DataTransformationService type
   - CalculatedMetrics type
   - UseCalculatedMetricsReturn type
   - MuscleGainLimits type
   - GoalValidation type

3. **Fix inline style object access** (medium priority)
   - Create type definitions for style objects
   - OR use type assertions

4. **Fix component-specific issues** (low priority)
   - One-off fixes in specific screens
   - Form validation issues (trim on numbers)

5. **Fix library type issues** (low priority)
   - May require workarounds or @ts-ignore

## Files Modified
1. src/theme/aurora-tokens.ts
2. src/utils/constants.ts
3. src/types/diet.ts
4. src/types/workout.ts
5. src/types/ai.ts
6. src/types/user.ts
7. src/types/onboarding.ts

## Type Definitions Added/Updated
- Spacing: Added xxs
- BorderRadius: Added xs
- Colors: Added primaryFaded, textTertiary
- Macronutrients: Added sugar, sodium
- RecognizedFood: Added portionSize, enhancementSource
- FoodRecognitionResult: Added confidence, data
- Meal: Added total_carbohydrates, timing
- Workout: Added isRestDay, completed
- WeeklyWorkoutPlan: Added duration
- UserProfile.stats: Added achievements
- WorkoutPreferences: Added prefers_variety
- AdvancedReviewData: Added 11 missing properties
- WorkoutPreferencesData: Added session_duration_minutes, available_equipment
- DietPreferencesData: Added cuisine_preferences, snacks_count
