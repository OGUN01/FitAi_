# TS2339 Error Fixes Plan

## Category 1: Theme/Color Errors (13 errors)
- primaryFaded, textTertiary - need to map to aurora tokens
- xs in borderRadius (exists in spacing but not borderRadius)
- xxs in spacing (doesn't exist)

## Category 2: Type Definition Errors (110+ errors)
### Food/Diet Types
- confidence on FoodRecognitionResult
- portionSize, enhancementSource on RecognizedFood  
- timing on DayMeal
- sugar, sodium on nutrition macros
- total_carbohydrates on Meal
- dailyCalories on UseCalculatedMetricsReturn
- specialAction on DietPreferences

### Fitness Types
- duration on WeeklyWorkoutPlan
- isRestDay, completed on Workout
- max_heart_rate on AdvancedReviewData
- ideal_body_fat_max on CalculatedMetrics

### User/Profile Types
- achievements on stats object
- height, weight on BodyMetrics (should be height_cm, current_weight_kg)
- various snake_case fields on onboarding types

### Service Types
- MigrationResult properties
- DataTransformationService methods
- Various return type mismatches

### Style/UI Types
- buttonWrapper, statsContainer, etc. on styles objects
- emoji on card items
- children on Card props

### Form Errors
- trim() on number types (should be string)

## Category 3: Other Errors
- Reanimated Value._value access
- haptics.impact() method
- gluestack theme property
