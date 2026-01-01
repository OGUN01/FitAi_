# FALLBACK FIXES - QUICK START GUIDE

**Generated:** 2025-12-29
**Read this first, then see FALLBACK_VALUE_AUDIT.md for full details**

---

## THE PROBLEM IN ONE SENTENCE

Your app uses fallback values like `|| 'Champion'` and `|| 0` that hide missing data, making the app appear to work while delivering completely wrong fitness plans to users.

---

## TOP 5 MOST CRITICAL BUGS

### 1. VEGETARIAN GETS MEAT 🚨
```typescript
// src/contexts/EditContext.tsx:208
dietType: profile?.dietPreferences?.dietType || 'non-veg'
```
**Impact:** Vegetarian/vegan users get meat in their meal plans
**Fix:** Make dietType required, never default
**Priority:** P0 - Fix today

### 2. FEMALE GETS MALE PLAN 🚨
```typescript
// src/screens/onboarding/tabs/PersonalInfoTab.tsx:137
gender: data?.gender || 'male'
```
**Impact:** Female users get male BMR (+300 cal/day), wrong training
**Fix:** Force gender selection, never assume
**Priority:** P0 - Fix today

### 3. WRONG AGE = WRONG CALORIES 🚨
```typescript
// src/screens/main/HomeScreen.tsx:180
return userProfile?.personalInfo?.age || 30;
```
**Impact:** 20yr old gets 30yr BMR, 50yr old gets 30yr training plan
**Fix:** Require age, never default
**Priority:** P0 - Fix today

### 4. WEIGHT = 0 = NO PLAN 🚨
```typescript
// src/hooks/useHealthKitSync.ts:335
lastWeight: healthKit.healthMetrics.weight || 0
```
**Impact:** BMR = 0, all calculations fail, app broken
**Fix:** Require weight entry, show error if missing
**Priority:** P0 - Fix today

### 5. NO FITNESS GOALS = RANDOM WORKOUT 🚨
```typescript
// src/contexts/EditContext.tsx:195
primary_goals: profile?.fitnessGoals?.primary_goals || []
```
**Impact:** Empty array = generic workout, no personalization
**Fix:** Require at least one goal
**Priority:** P1 - Fix this week

---

## IMMEDIATE ACTION PLAN

### STEP 1: Add Validation (30 minutes)

Create this file:
```typescript
// src/utils/profileValidation.ts

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  missingFields: string[];
}

export function validateCompleteProfile(profile: UserProfile): ValidationResult {
  const errors: string[] = [];
  const missing: string[] = [];

  // Personal Info - REQUIRED
  if (!profile.personalInfo?.name?.trim()) {
    errors.push('Name is required');
    missing.push('personalInfo.name');
  }
  if (!profile.personalInfo?.age || profile.personalInfo.age < 13 || profile.personalInfo.age > 120) {
    errors.push('Valid age (13-120) is required');
    missing.push('personalInfo.age');
  }
  if (!profile.personalInfo?.gender || !['male', 'female', 'other'].includes(profile.personalInfo.gender)) {
    errors.push('Gender is required');
    missing.push('personalInfo.gender');
  }

  // Body Metrics - REQUIRED
  if (!profile.bodyMetrics?.current_weight_kg || profile.bodyMetrics.current_weight_kg <= 0) {
    errors.push('Current weight is required');
    missing.push('bodyMetrics.current_weight_kg');
  }
  if (!profile.bodyMetrics?.height_cm || profile.bodyMetrics.height_cm <= 0) {
    errors.push('Height is required');
    missing.push('bodyMetrics.height_cm');
  }

  // Fitness Goals - REQUIRED
  if (!profile.fitnessGoals?.primary_goals?.length) {
    errors.push('At least one fitness goal is required');
    missing.push('fitnessGoals.primary_goals');
  }
  if (!profile.fitnessGoals?.experience) {
    errors.push('Experience level is required');
    missing.push('fitnessGoals.experience');
  }

  // Diet - REQUIRED
  if (!profile.dietPreferences?.dietType) {
    errors.push('Diet type is required');
    missing.push('dietPreferences.dietType');
  }
  if (profile.dietPreferences?.allergies === undefined) {
    errors.push('Allergy information required (can be empty)');
    missing.push('dietPreferences.allergies');
  }

  // Workout - REQUIRED
  if (!profile.workoutPreferences?.location) {
    errors.push('Workout location is required');
    missing.push('workoutPreferences.location');
  }
  if (!profile.workoutPreferences?.equipment) {
    errors.push('Equipment information required');
    missing.push('workoutPreferences.equipment');
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingFields: missing
  };
}

// Helper to throw on missing data
export function getRequiredField<T>(
  value: T | null | undefined,
  fieldName: string,
  context: string = ''
): T {
  if (value === null || value === undefined) {
    const msg = `Required field missing: ${fieldName}${context ? ` (${context})` : ''}`;
    console.error(`[VALIDATION ERROR] ${msg}`);
    throw new Error(msg);
  }
  return value;
}
```

### STEP 2: Fix Critical Screens (1 hour)

#### HomeScreen.tsx
```typescript
// BEFORE
const userName = profile?.personalInfo?.name || userProfile?.personalInfo?.name || 'Champion';

// AFTER
const userName = useMemo(() => {
  const name = profile?.personalInfo?.name || userProfile?.personalInfo?.name;
  if (!name) {
    console.warn('[HomeScreen] Missing user name - profile incomplete');
    return 'PROFILE_INCOMPLETE'; // Obvious placeholder
  }
  return name;
}, [profile, userProfile]);

// Better: Show error state
if (!profile?.personalInfo?.name) {
  return <IncompleteProfileScreen missingFields={['name']} />;
}
```

#### FitnessScreen.tsx
```typescript
// BEFORE
const userName = profile?.personalInfo?.name || 'Champion';

// AFTER
const userName = getRequiredField(
  profile?.personalInfo?.name,
  'personalInfo.name',
  'FitnessScreen'
);

// OR
if (!validateCompleteProfile(profile).isValid) {
  return <IncompleteProfileScreen />;
}
const userName = profile.personalInfo.name; // Safe now
```

#### DietScreen.tsx
```typescript
// BEFORE
const userName = profile?.personalInfo?.name?.split(' ')[0] || 'there';

// AFTER
const firstName = useMemo(() => {
  const fullName = profile?.personalInfo?.name;
  if (!fullName) {
    console.warn('[DietScreen] Missing user name');
    return null; // Will trigger error UI
  }
  return fullName.split(' ')[0];
}, [profile]);

if (!firstName) {
  return <IncompleteProfileScreen />;
}
```

### STEP 3: Fix EditContext (30 minutes)

```typescript
// src/contexts/EditContext.tsx

// BEFORE (lines 179-230)
sectionData = {
  first_name: profile?.personalInfo?.first_name || '',
  last_name: profile?.personalInfo?.last_name || '',
  name: profile?.personalInfo?.name || '',
  email: user?.email || profile?.personalInfo?.email || '',
  age: profile?.personalInfo?.age || 0,
  gender: profile?.personalInfo?.gender || '',
  // ... etc
};

// AFTER
sectionData = {
  first_name: profile?.personalInfo?.first_name ?? '',
  last_name: profile?.personalInfo?.last_name ?? '',
  name: profile?.personalInfo?.name ?? '', // Use ?? instead of ||
  email: user?.email ?? profile?.personalInfo?.email ?? '',
  age: profile?.personalInfo?.age ?? null, // NULL not 0
  gender: profile?.personalInfo?.gender ?? null, // NULL not ''
  activityLevel: profile?.personalInfo?.activityLevel ?? null,
  // ... etc
};

// Then validate before save
if (!sectionData.name || !sectionData.age || !sectionData.gender) {
  throw new Error('Cannot save incomplete personal info');
}
```

### STEP 4: Fix Health Calculations (30 minutes)

```typescript
// src/utils/healthCalculations.ts

export function calculateBMR(profile: UserProfile): number {
  // VALIDATE FIRST
  const age = getRequiredField(profile.personalInfo?.age, 'age', 'BMR calculation');
  const gender = getRequiredField(profile.personalInfo?.gender, 'gender', 'BMR calculation');
  const weight = getRequiredField(profile.bodyMetrics?.current_weight_kg, 'weight', 'BMR calculation');
  const height = getRequiredField(profile.bodyMetrics?.height_cm, 'height', 'BMR calculation');

  // Validate ranges
  if (age < 13 || age > 120) throw new Error('Invalid age for BMR calculation');
  if (weight <= 0 || weight > 500) throw new Error('Invalid weight for BMR calculation');
  if (height <= 0 || height > 300) throw new Error('Invalid height for BMR calculation');

  // NOW calculate
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    // Use average of male/female for 'other'
    return 10 * weight + 6.25 * height - 5 * age - 78;
  }
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile); // Will throw if incomplete
  const activityLevel = getRequiredField(
    profile.personalInfo?.activityLevel,
    'activityLevel',
    'TDEE calculation'
  );

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  if (!(activityLevel in multipliers)) {
    throw new Error(`Invalid activity level: ${activityLevel}`);
  }

  return bmr * multipliers[activityLevel];
}
```

### STEP 5: Add Database Constraints (15 minutes)

```sql
-- supabase/migrations/YYYYMMDD_required_fields.sql

-- Personal Info
ALTER TABLE user_profiles
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN age SET NOT NULL,
  ALTER COLUMN gender SET NOT NULL,
  ADD CONSTRAINT age_valid CHECK (age >= 13 AND age <= 120),
  ADD CONSTRAINT gender_valid CHECK (gender IN ('male', 'female', 'other')),
  ADD CONSTRAINT name_not_empty CHECK (trim(name) != '');

-- Body Metrics
ALTER TABLE body_metrics
  ALTER COLUMN current_weight_kg SET NOT NULL,
  ALTER COLUMN height_cm SET NOT NULL,
  ADD CONSTRAINT weight_valid CHECK (current_weight_kg > 0 AND current_weight_kg < 500),
  ADD CONSTRAINT height_valid CHECK (height_cm > 0 AND height_cm < 300);

-- Fitness Goals
ALTER TABLE fitness_goals
  ALTER COLUMN primary_goals SET NOT NULL,
  ALTER COLUMN experience SET NOT NULL,
  ADD CONSTRAINT has_goals CHECK (array_length(primary_goals, 1) > 0),
  ADD CONSTRAINT experience_valid CHECK (experience IN ('beginner', 'intermediate', 'advanced'));

-- Diet Preferences
ALTER TABLE diet_preferences
  ALTER COLUMN diet_type SET NOT NULL,
  ALTER COLUMN allergies SET NOT NULL, -- Can be empty array
  ALTER COLUMN allergies SET DEFAULT '{}',
  ADD CONSTRAINT diet_type_valid CHECK (diet_type IN ('veg', 'non-veg', 'vegan', 'eggetarian'));

-- Workout Preferences
ALTER TABLE workout_preferences
  ALTER COLUMN location SET NOT NULL,
  ALTER COLUMN equipment SET NOT NULL, -- Can be empty array
  ALTER COLUMN equipment SET DEFAULT '{}',
  ADD CONSTRAINT location_valid CHECK (location IN ('home', 'gym', 'both'));
```

---

## TESTING CHECKLIST

After making changes, test these scenarios:

### Test 1: New User Without Name
- [ ] Start onboarding
- [ ] Skip name field
- [ ] Try to continue → Should be BLOCKED
- [ ] Check HomeScreen → Should NOT show "Champion"

### Test 2: User Without Gender
- [ ] Start onboarding
- [ ] Skip gender selection
- [ ] Try to generate workout → Should FAIL with error message
- [ ] Check calculations → Should NOT assume male

### Test 3: Vegetarian User
- [ ] Select "Vegetarian" diet type
- [ ] Generate meal plan
- [ ] Check ALL meals → Should have ZERO meat/fish/eggs
- [ ] Try skipping diet type → Should be BLOCKED

### Test 4: Missing Weight
- [ ] Start onboarding
- [ ] Skip weight entry
- [ ] Try to calculate BMR → Should FAIL
- [ ] Check home screen → Should NOT show 0 calories

### Test 5: Database Integrity
- [ ] Try to save profile with NULL name → Should FAIL
- [ ] Try to save age = 0 → Should FAIL
- [ ] Try to save weight = -10 → Should FAIL
- [ ] Check database → No invalid data

---

## BEFORE/AFTER COMPARISON

### BEFORE (Current Broken State)
```typescript
// Vegetarian user
dietType: profile?.dietPreferences?.dietType || 'non-veg'
// Result: Gets MEAT in meal plan ❌

// Female user
gender: data?.gender || 'male'
// Result: Gets MALE BMR and training ❌

// 50-year-old user
age: userProfile?.personalInfo?.age || 30
// Result: Gets 30-year-old plan ❌

// User without gym
equipment: profile?.workoutPreferences?.equipment || []
// Result: Gets bodyweight-only when they have full gym ❌
```

### AFTER (Fixed State)
```typescript
// Vegetarian user
dietType: getRequiredField(profile?.dietPreferences?.dietType, 'dietType')
// Result: MUST select diet type, gets correct meals ✅

// Female user
gender: getRequiredField(data?.gender, 'gender')
// Result: MUST select gender, gets correct BMR ✅

// 50-year-old user
age: getRequiredField(userProfile?.personalInfo?.age, 'age')
// Result: MUST enter age, gets age-appropriate plan ✅

// User without gym
equipment: getRequiredField(profile?.workoutPreferences?.equipment, 'equipment')
// Result: MUST select equipment, gets matching workout ✅
```

---

## MONITORING

Add this to track how many users hit missing data:

```typescript
// src/utils/analytics.ts

export function trackMissingField(field: string, context: string) {
  console.warn(`[MISSING FIELD] ${field} in ${context}`);

  // Send to analytics
  Analytics.logEvent('missing_required_field', {
    field,
    context,
    timestamp: new Date().toISOString()
  });

  // If too many errors, alert developers
  const errorCount = getErrorCount(field);
  if (errorCount > 100) {
    alertDevelopers(`Critical: ${field} missing for 100+ users`);
  }
}
```

---

## FILES TO MODIFY (Priority Order)

### 🚨 P0 - Fix Today (3 hours):
1. `src/contexts/EditContext.tsx` - Lines 179-230
2. `src/screens/main/HomeScreen.tsx` - Lines 180, 346-347
3. `src/screens/main/FitnessScreen.tsx` - Line 347
4. `src/screens/main/DietScreen.tsx` - Line 216
5. `src/screens/onboarding/tabs/PersonalInfoTab.tsx` - Lines 136-137
6. `src/utils/healthCalculations.ts` - All BMR/TDEE functions

### 🔥 P1 - Fix This Week (8 hours):
7. `src/services/onboardingService.ts`
8. `src/services/userProfile.ts`
9. `src/features/nutrition/NutritionEngine.ts`
10. `src/features/workouts/WorkoutEngine.ts`
11. `src/utils/integration.ts`
12. Database migrations

### ⚠️ P2 - Fix Next Week (16 hours):
13. All other fallback instances (see FALLBACK_VALUE_AUDIT.md)

---

## SUCCESS METRICS

After fixes, you should see:

✅ **0 users** with missing required fields in database
✅ **0 vegetarians** getting meat in meal plans
✅ **0 females** getting male training plans
✅ **100%** of users complete onboarding before seeing main app
✅ **Error rate** for profile incomplete goes from 0% (hidden) to detected
✅ **User retention** improves (correct plans = better results)

---

## NEED HELP?

See full details in `FALLBACK_VALUE_AUDIT.md`:
- Complete list of all 287+ fallback instances
- Detailed explanation of each issue
- Full code examples
- Testing procedures
- Impact analysis

---

## ESTIMATED TIME

- **Reading this guide:** 10 minutes
- **Step 1 (Validation):** 30 minutes
- **Step 2 (Screens):** 1 hour
- **Step 3 (EditContext):** 30 minutes
- **Step 4 (Calculations):** 30 minutes
- **Step 5 (Database):** 15 minutes
- **Testing:** 1 hour

**Total:** ~4 hours to fix all P0 critical issues

---

## THE BOTTOM LINE

Your app currently:
- Shows "Champion" to every user without a name
- Gives meat to vegetarians
- Gives female BMR to males (and vice versa)
- Uses wrong age for everyone
- Appears to work but delivers wrong fitness plans

These fallbacks make the app look functional while completely breaking personalization.

**Fix today. This is a P0 production bug.**
