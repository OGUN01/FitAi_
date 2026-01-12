# Onboarding Data to Workers API Mapping

## Complete Data Flow Audit (January 2026)

This document maps how data flows from onboarding screens → database → Workers API for workout generation.

---

## 1. FITNESS GOALS MAPPING

### Onboarding Screen (`FitnessGoalsScreen.tsx`)
```typescript
const FITNESS_GOALS = [
  'weight-loss',      // ❌ MISMATCH
  'weight-gain',      // ❌ NOT IN API
  'muscle-gain',      // ❌ MISMATCH
  'strength',         // ✅ OK
  'endurance',        // ✅ OK
  'flexibility',      // ✅ OK
  'general_fitness',  // ❌ NOT IN API
];
```

### Database (`workout_preferences.primary_goals`)
```json
["weight-loss", "muscle-gain"]
```

### Workers API Expects (`FitnessGoalSchema`)
```typescript
z.enum([
  'weight_loss',            // ✅ (underscore, not hyphen)
  'muscle_gain',            // ✅ (underscore, not hyphen)
  'maintenance',            // ❌ MISSING IN ONBOARDING
  'strength',               // ✅
  'endurance',              // ✅
  'flexibility',            // ✅
  'athletic_performance',   // ❌ MISSING IN ONBOARDING
])
```

### 🔧 FIXES NEEDED:
- [ ] Convert `weight-loss` → `weight_loss`
- [ ] Convert `muscle-gain` → `muscle_gain`
- [ ] Map `general_fitness` → `maintenance`
- [ ] Map `weight-gain` → `muscle_gain`

---

## 2. EQUIPMENT MAPPING

### Onboarding Screen (`WorkoutPreferencesScreen.tsx`)
```typescript
const equipmentOptions = [
  'bodyweight',           // ❌ MISMATCH → 'body weight'
  'dumbbells',            // ❌ MISMATCH → 'dumbbell'
  'resistance-bands',     // ❌ MISMATCH → 'resistance band'
  'kettlebells',          // ❌ MISMATCH → 'kettlebell'
  'barbell',              // ✅ OK
  'pull-up-bar',          // ❌ NOT IN API
  'yoga-mat',             // ❌ NOT IN API
  'bench',                // ❌ NOT IN API
  'cable-machine',        // ❌ MISMATCH → 'cable'
  'treadmill',            // ❌ NOT IN API
  'stationary-bike',      // ✅ OK (but check exact match)
  'rowing-machine',       // ❌ NOT IN API
];
```

### Database (`workout_preferences.equipment`)
```json
["bodyweight", "dumbbells", "barbell", "kettlebells", "pull-up-bar", "treadmill", "stationary-bike", "yoga-mat"]
```

### Workers API Expects (`EquipmentSchema`)
```typescript
z.enum([
  'body weight',          // ✅ (space!)
  'dumbbell',             // ✅ (singular!)
  'barbell',              // ✅
  'band',                 // ✅
  'cable',                // ✅
  'machine',              // ✅
  'kettlebell',           // ✅ (singular!)
  'medicine ball',        // ✅
  'foam roll',            // ✅
  'ez barbell',           // ✅
  'trap bar',             // ✅
  'bosu ball',            // ✅
  'resistance band',      // ✅ (space!)
  'stability ball',       // ✅
  'olympic barbell',      // ✅
  'smith machine',        // ✅
  'assisted',             // ✅
  'leverage machine',     // ✅
  'rope',                 // ✅
  'sled machine',         // ✅
  'skierg machine',       // ✅
  'stationary bike',      // ✅ (space!)
  'upper body ergometer', // ✅
  'elliptical machine',   // ✅
  'stepmill machine',     // ✅
  'wheel roller',         // ✅
  'weighted',             // ✅
  'tire',                 // ✅
  'hammer',               // ✅
  'roller',               // ✅
])
```

### 🔧 FIXES NEEDED:
- [ ] `bodyweight` → `body weight`
  - [ ] `dumbbells` → `dumbbell`
- [ ] `kettlebells` → `kettlebell`
- [ ] `resistance-bands` → `resistance band`
- [ ] `cable-machine` → `cable`
- [ ] `stationary-bike` → `stationary bike`
- [ ] `pull-up-bar` → `body weight` (or add to API)
- [ ] `yoga-mat` → `body weight` (or remove)
- [ ] `bench` → `body weight` (bench is implied with barbell)
- [ ] `treadmill` → remove or ignore (cardio equipment not needed)
- [ ] `rowing-machine` → remove or ignore

---

## 3. WORKOUT TYPE MAPPING

### Onboarding Screen (`WorkoutPreferencesScreen.tsx`)
```typescript
const workoutTypeOptions = [
  'strength',           // ❌ MISMATCH
  'cardio',             // ✅ OK
  'hiit',               // ❌ NOT IN API
  'yoga',               // ❌ NOT IN API
  'pilates',            // ❌ NOT IN API
  'flexibility',        // ❌ NOT IN API
  'functional',         // ❌ NOT IN API
  'sports',             // ❌ NOT IN API
  'dance',              // ❌ NOT IN API
  'martial-arts',       // ❌ NOT IN API
];
```

### Workers API Expects (`WorkoutTypeSchema`)
```typescript
z.enum([
  'full_body',    // ❌ MISSING IN ONBOARDING
  'upper_body',   // ❌ MISSING IN ONBOARDING
  'lower_body',   // ❌ MISSING IN ONBOARDING
  'push',         // ❌ MISSING IN ONBOARDING
  'pull',         // ❌ MISSING IN ONBOARDING
  'legs',         // ❌ MISSING IN ONBOARDING
  'chest',        // ❌ MISSING IN ONBOARDING
  'back',         // ❌ MISSING IN ONBOARDING
  'shoulders',    // ❌ MISSING IN ONBOARDING
  'arms',         // ❌ MISSING IN ONBOARDING
  'core',         // ❌ MISSING IN ONBOARDING
  'cardio',       // ✅ OK
])
```

### 🔧 FIXES NEEDED:
**The onboarding workoutTypes and API workoutType serve different purposes!**

- **Onboarding `workoutTypes`**: User preferences (what they LIKE to do: strength, cardio, hiit, yoga)
- **API `workoutType`**: Specific workout split (what workout to GENERATE: full_body, upper_body, etc.)

**Solution**:
- Keep onboarding `workoutTypes` as-is (user preferences)
- In `aiRequestTransformers.ts`, map preferences to actual workout type:
  - `strength` preference → `full_body` workout
  - `cardio` preference → `cardio` workout
  - `hiit` preference → `full_body` workout (with HIIT exercises)

---

## 4. EXPERIENCE LEVEL MAPPING

### Onboarding → Database → API
✅ **ALREADY CORRECT!**

```typescript
// All systems use the same values:
'beginner' | 'intermediate' | 'advanced'
```

---

## 5. COMPLETE DATA TRANSFORMATION NEEDED

### Current Transformer (`aiRequestTransformers.ts:105-152`)
```typescript
export function transformForWorkoutRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyMetrics?: BodyMetrics,
  workoutPreferences?: WorkoutPreferences,
) {
  const primaryGoal = fitnessGoals.primary_goals?.[0] || 'general_fitness';  // ❌ WRONG
  const equipment = workoutPreferences?.equipment || ['bodyweight'];         // ❌ WRONG

  return {
    profile: {
      fitnessGoal: primaryGoal,              // ❌ Sends 'weight-loss' instead of 'weight_loss'
      availableEquipment: equipment,         // ❌ Sends 'bodyweight' instead of 'body weight'
    },
    workoutType: options?.workoutType || 'strength',  // ❌ Sends 'strength' instead of 'full_body'
  };
}
```

### ✅ CORRECT Transformer (To Be Implemented)
```typescript
export function transformForWorkoutRequest(...) {
  // 1. Map fitness goals (hyphen → underscore)
  const goalMap: Record<string, string> = {
    'weight-loss': 'weight_loss',
    'weight-gain': 'muscle_gain',
    'muscle-gain': 'muscle_gain',
    'general_fitness': 'maintenance',
    'strength': 'strength',
    'endurance': 'endurance',
    'flexibility': 'flexibility',
  };

  const primaryGoal = goalMap[fitnessGoals.primary_goals?.[0]] || 'maintenance';

  // 2. Map equipment (plural → singular, hyphens → spaces)
  const equipmentMap: Record<string, string> = {
    'bodyweight': 'body weight',
    'dumbbells': 'dumbbell',
    'kettlebells': 'kettlebell',
    'resistance-bands': 'resistance band',
    'cable-machine': 'cable',
    'stationary-bike': 'stationary bike',
    'barbell': 'barbell',
    'pull-up-bar': 'body weight',  // Fallback
    'yoga-mat': 'body weight',     // Not needed
    'bench': 'body weight',        // Implied with barbell
    'treadmill': 'body weight',    // Cardio, not strength
    'rowing-machine': 'body weight',
  };

  const equipment = (workoutPreferences?.equipment || ['bodyweight'])
    .map(eq => equipmentMap[eq] || eq)
    .filter((v, i, a) => a.indexOf(v) === i);  // Dedupe

  // 3. Map workout type (user preference → actual split)
  const workoutTypeMap: Record<string, string> = {
    'strength': 'full_body',
    'cardio': 'cardio',
    'hiit': 'full_body',
    'yoga': 'flexibility',      // Not in API, use flexibility
    'pilates': 'core',
    'flexibility': 'flexibility',  // Not in API, use core
    'functional': 'full_body',
    'sports': 'full_body',
  };

  const workoutType = workoutTypeMap[options?.workoutType || 'strength'] || 'full_body';

  return {
    profile: {
      fitnessGoal: primaryGoal,           // ✅ Correct format
      availableEquipment: equipment,      // ✅ Correct format
      experienceLevel: workoutPreferences?.intensity || 'beginner',
    },
    workoutType: workoutType,             // ✅ Correct format
  };
}
```

---

## 6. EXERCISE MEDIA (GIF) VERIFICATION

### Current Flow:
1. Workers API generates workout with exercise IDs
2. App receives `exerciseId` (e.g., `"0001"`)
3. App needs to fetch GIF from exercise database

### Questions to Verify:
- [ ] Where is exercise media stored? (Supabase `exercise_media` table?)
- [ ] How does app fetch GIFs by exerciseId?
- [ ] Is there 100% coverage for all exercises in database?
- [ ] What's the fallback if GIF is missing?

---

## IMPLEMENTATION CHECKLIST

### Phase 1: Fix Data Transformers
- [ ] Update `aiRequestTransformers.ts` with mapping functions
- [ ] Add equipment mapping
- [ ] Add fitness goal mapping
- [ ] Add workout type mapping
- [ ] Add comprehensive tests

### Phase 2: Verify Database Schema
- [ ] Check if `workout_preferences.primary_goals` uses hyphens or underscores
- [ ] Verify equipment values in database
- [ ] Ensure consistency across all tables

### Phase 3: Exercise Media Verification
- [ ] Audit exercise database for GIF coverage
- [ ] Verify media fetching logic
- [ ] Test fallback mechanisms

### Phase 4: End-to-End Testing
- [ ] Test onboarding → database save
- [ ] Test database → API request transformation
- [ ] Test API response → app display
- [ ] Verify GIFs load for all exercises

---

## NEXT STEPS

1. ✅ **Audit Complete** - We now understand the full data flow
2. 🔧 **Fix Transformers** - Implement mapping functions
3. ✅ **Test** - Verify data flows correctly end-to-end
4. 🎬 **Deploy** - Roll out fixes to production
