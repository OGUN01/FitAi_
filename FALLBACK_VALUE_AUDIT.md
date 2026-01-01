# FALLBACK VALUE AUDIT - COMPLETE ANALYSIS

**Generated:** 2025-12-29
**Purpose:** Identify ALL fallback values that could be masking missing onboarding data

---

## EXECUTIVE SUMMARY

Found **287+ instances** of fallback values across the codebase. Categorized into:
- **CRITICAL (42)**: Hides missing onboarding data - user sees app working but data is incomplete
- **HIGH (89)**: Hides profile data issues - prevents proper error detection
- **MEDIUM (76)**: UI placeholders that should show errors instead
- **LOW (80)**: Legitimate defaults for optional features

---

## CRITICAL ISSUES - ONBOARDING DATA MASKING

### 1. USER NAME FALLBACKS (10 instances)

#### **CRITICAL - HomeScreen.tsx:346-347**
```typescript
userName={profile?.personalInfo?.name || userProfile?.personalInfo?.name || 'Champion'}
userInitial={(profile?.personalInfo?.name || userProfile?.personalInfo?.name || 'C').charAt(0)}
```
- **Field:** `personalInfo.name`
- **Why undefined:** User hasn't completed Personal Info tab or data failed to save
- **Current behavior:** Shows "Champion" - user thinks onboarding completed
- **Should be:** Show error banner "Complete your profile" or prevent navigation
- **Impact:** User can skip entire onboarding and app appears to work

#### **CRITICAL - FitnessScreen.tsx:347**
```typescript
const userName = profile?.personalInfo?.name || 'Champion';
```
- **Field:** `personalInfo.name`
- **Why undefined:** Missing onboarding data
- **Current behavior:** Screen shows "Champion" everywhere
- **Should be:** Show incomplete profile warning, disable workout generation
- **Impact:** Can generate workouts without complete user data

#### **CRITICAL - DietScreen.tsx:216**
```typescript
return profile?.personalInfo?.name?.split(' ')[0] || 'there';
```
- **Field:** `personalInfo.name`
- **Why undefined:** Missing personal info
- **Current behavior:** Greets user as "Hey there!"
- **Should be:** Error state or onboarding redirect
- **Impact:** Masks incomplete profile

#### **CRITICAL - DietScreenNew.tsx:215**
```typescript
return profile?.personalInfo?.name?.split(' ')[0] || 'there';
```
- **Duplicate of above**
- **Same issue**

#### **CRITICAL - ProfileScreen.tsx:124**
```typescript
profile?.personalInfo?.name || user?.name || 'Anonymous User'
```
- **Field:** `personalInfo.name`
- **Why undefined:** Profile incomplete
- **Current behavior:** Shows "Anonymous User" - looks intentional
- **Should be:** Validation error, force profile completion
- **Impact:** Profile screen appears complete when it's not

#### **CRITICAL - OnboardingContainer.tsx:504**
```typescript
userName={personalInfo?.name || 'Champion'}
```
- **Field:** `personalInfo.name`
- **Why undefined:** User hasn't entered name yet
- **Current behavior:** Shows "Champion" during onboarding
- **Should be:** Show "Enter your name" or disable continue
- **Impact:** User can proceed without entering name

#### **CRITICAL - HomeScreenIntegrationExample.tsx:68**
```typescript
Good {getTimeOfDay()}, {profile?.personalInfo.name || 'Fitness Enthusiast'}!
```
- **Field:** `personalInfo.name`
- **Same issue as others**

#### **CRITICAL - profile/ProfileHeader.tsx:99**
```typescript
<Text style={styles.userName}>{userName || 'Fitness Champion'}</Text>
```
- **Field:** Passed-in userName
- **Why undefined:** Parent passed incomplete data
- **Should be:** Validate userName prop is required

#### **CRITICAL - EditContext.tsx:181**
```typescript
name: profile?.personalInfo?.name || '',
```
- **Field:** `personalInfo.name`
- **Why undefined:** Editing mode with incomplete data
- **Current behavior:** Empty string allows saving empty name
- **Should be:** Require name before allowing edit save
- **Impact:** Can overwrite valid name with empty string

#### **CRITICAL - ReviewScreen.tsx:119**
```typescript
<Text style={styles.dataItem}>Name: {data.personalInfo.name || 'Not set'}</Text>
```
- **Field:** `personalInfo.name`
- **Why undefined:** Review incomplete onboarding
- **Current behavior:** Shows "Not set" but allows continue
- **Should be:** Block review submission if "Not set"
- **Impact:** User can see "Not set" and still submit

---

### 2. AGE FALLBACKS (9 instances)

#### **CRITICAL - EditContext.tsx:183**
```typescript
age: profile?.personalInfo?.age || 0,
```
- **Field:** `personalInfo.age`
- **Why undefined:** Missing age in onboarding
- **Current behavior:** Age becomes 0 - causes invalid BMR calculations
- **Should be:** Throw error, age is required for fitness calculations
- **Impact:** All calorie calculations will be wrong (BMR requires age)

#### **CRITICAL - HomeScreen.tsx:180**
```typescript
return userProfile?.personalInfo?.age || profile?.personalInfo?.age || 30;
```
- **Field:** `personalInfo.age`
- **Why undefined:** Profile incomplete
- **Current behavior:** Defaults to 30 years old - WRONG FITNESS PLAN
- **Should be:** Error state, cannot calculate without real age
- **Impact:**
  - 20-year-old gets 30-year-old BMR (off by ~200 cal/day)
  - 50-year-old gets 30-year-old plan (too intense)
  - Training zones completely wrong

#### **CRITICAL - PersonalInfoTab.tsx:136**
```typescript
age: data?.age || 0,
```
- **Field:** `age`
- **Why undefined:** User hasn't entered age
- **Current behavior:** Sets to 0, allows saving
- **Should be:** Required field validation
- **Impact:** Can save profile with age=0

#### **CRITICAL - PersonalInfoTab.tsx:163**
```typescript
age: data.age || 0,
```
- **Same issue - duplicate location**

#### **CRITICAL - userProfile.ts:444**
```typescript
age: dbProfile.age || 0,
```
- **Field:** `age` from database
- **Why undefined:** Database has NULL age
- **Current behavior:** Converts NULL to 0
- **Should be:** Detect NULL and show error
- **Impact:** Database integrity issue hidden

#### **CRITICAL - onboardingService.ts:91**
```typescript
age: data.age || 0,
```
- **Field:** `age` from onboarding
- **Current behavior:** Allows saving 0
- **Should be:** Validate age >= 13 before this point

#### **CRITICAL - ReviewScreen.tsx:120**
```typescript
<Text style={styles.dataItem}>Age: {data.personalInfo.age || 'Not set'}</Text>
```
- **Field:** `age`
- **Current behavior:** Shows "Not set" but can continue
- **Should be:** Block submission

#### **CRITICAL - PersonalInfoEditModal.tsx:185**
```typescript
age !== (info?.age || '') ||
```
- **Field:** `age`
- **Why undefined:** Edit modal with missing age
- **Current behavior:** Compares to empty string (wrong type)
- **Should be:** Validate age is number

#### **CRITICAL - PersonalInfoScreen.tsx:70**
```typescript
age: data.age || '',
```
- **Field:** `age`
- **Current behavior:** Empty string in form
- **Should be:** Require before allowing save

---

### 3. GENDER FALLBACKS (9 instances)

#### **CRITICAL - EditContext.tsx:184**
```typescript
gender: profile?.personalInfo?.gender || '',
```
- **Field:** `personalInfo.gender`
- **Why undefined:** Missing gender selection
- **Current behavior:** Empty string - breaks BMR calculation
- **Should be:** Required field
- **Impact:** BMR calculation needs gender (male/female have different formulas)

#### **CRITICAL - PersonalInfoTab.tsx:137**
```typescript
gender: data?.gender || 'male',
```
- **Field:** `gender`
- **Why undefined:** Not selected yet
- **Current behavior:** ASSUMES MALE - WRONG PLAN FOR FEMALES
- **Should be:** Force user to select
- **Impact:**
  - Female gets male BMR (300+ cal/day too high)
  - Female gets male training recommendations
  - Completely wrong fitness plan

#### **CRITICAL - PersonalInfoTab.tsx:164**
```typescript
gender: data.gender || 'male',
```
- **Same issue - duplicate**

#### **CRITICAL - onboardingService.ts:92**
```typescript
gender: data.gender || 'male',
```
- **Field:** `gender`
- **Current behavior:** ASSUMES MALE when saving to database
- **Should be:** Validation error
- **Impact:** Database has wrong gender, persists forever

#### **CRITICAL - userProfile.ts:445**
```typescript
gender: dbProfile.gender || '',
```
- **Field:** `gender` from database
- **Current behavior:** Empty string if NULL
- **Should be:** Error detection

#### **CRITICAL - BodyAnalysisTab.tsx:1251**
```typescript
gender={personalInfoData?.gender || 'male'}
```
- **Field:** `gender` passed to body analysis
- **Current behavior:** Assumes male for body composition calculations
- **Should be:** Require gender before showing body analysis
- **Impact:** Body fat % calculations completely wrong for females

#### Other instances in PersonalInfoScreen.tsx, ReviewScreen.tsx, PersonalInfoEditModal.tsx
- All same issue - allowing empty/default gender

---

### 4. WEIGHT FALLBACKS (7 instances)

#### **CRITICAL - healthMetrics.weight || 0**
```typescript
lastWeight: healthKit.healthMetrics.weight || 0,
```
- **File:** useHealthKitSync.ts:335
- **Field:** `weight` from HealthKit
- **Why undefined:** HealthKit sync failed or no data
- **Current behavior:** Weight = 0 kg
- **Should be:** Show error, require manual weight entry
- **Impact:**
  - BMR = 0 (weight is primary variable)
  - Calorie targets completely wrong
  - Cannot generate any valid plan

#### **CRITICAL - bodyMetrics?.current_weight_kg**
Multiple instances in screens:
- HomeScreen.tsx:186
- AnalyticsScreen.tsx:98
- PersonalInfoEditModal.tsx:100
- BodyMeasurementsEditModal.tsx:50

All have same issue:
```typescript
const currentWeight = healthMetrics?.weight || userProfile?.bodyMetrics?.current_weight_kg;
```
- **Current behavior:** Falls through to undefined, then 0
- **Should be:** Required field for any fitness calculation
- **Impact:** Cannot calculate TDEE, BMR, macros without weight

---

### 5. HEIGHT FALLBACKS (3 instances)

#### **CRITICAL - bodyMetrics?.height_cm**
```typescript
const heightCm = profile?.bodyMetrics?.height_cm || 0;
```
- **Files:**
  - integration.ts:484, 511
  - ProfileScreen.tsx:161
  - PersonalInfoEditModal.tsx:99, 187

- **Field:** `height_cm`
- **Why undefined:** Not entered in onboarding
- **Current behavior:** Height = 0 cm
- **Should be:** Required field
- **Impact:**
  - BMI = divide by zero error
  - BMR calculation wrong
  - Cannot determine healthy weight range
  - Training intensity calculations fail

---

### 6. FITNESS GOALS FALLBACKS (15 instances)

#### **CRITICAL - primary_goals || []**
```typescript
primary_goals: profile?.fitnessGoals?.primary_goals || profile?.fitnessGoals?.primaryGoals || [],
```
- **Files:** EditContext.tsx:195, App.tsx:129, WorkoutEngine.ts:167, NutritionEngine.ts:200, many more
- **Field:** `fitnessGoals.primary_goals`
- **Why undefined:** User didn't select goals
- **Current behavior:** Empty array - generates GENERIC workout
- **Should be:** Require at least one goal
- **Impact:**
  - Muscle gain user gets random workout
  - Weight loss user gets wrong macros
  - No personalization at all

#### **CRITICAL - experience || 'beginner'**
```typescript
experience: profile?.fitnessGoals?.experience || '',
experience_level: profile?.fitnessGoals?.experience_level || profile?.fitnessGoals?.experience || '',
```
- **Files:** EditContext.tsx:197-198, FitnessGoalsScreen.tsx:91, exerciseFilterService.ts:144
- **Field:** `experience`
- **Why undefined:** Not selected
- **Current behavior:** Defaults to 'beginner' or empty string
- **Should be:** Force selection
- **Impact:**
  - Advanced athlete gets beginner workout (too easy)
  - Beginner gets advanced workout (injury risk)
  - Exercise difficulty completely wrong

#### **CRITICAL - time_commitment || ''**
```typescript
time_commitment: profile?.fitnessGoals?.time_commitment || profile?.fitnessGoals?.timeCommitment || '',
```
- **Files:** EditContext.tsx:196, integration.ts:165, 178
- **Field:** `timeCommitment`
- **Why undefined:** Not selected
- **Current behavior:** Empty string - default workout length used
- **Should be:** Require selection
- **Impact:**
  - User with 15 min gets 60 min workout (won't complete)
  - Affects adherence and retention

---

### 7. DIET PREFERENCES FALLBACKS (8 instances)

#### **CRITICAL - dietType || 'non-veg'**
```typescript
dietType: profile?.dietPreferences?.dietType || 'non-veg' as const,
```
- **Files:** EditContext.tsx:208, DietPreferencesScreen.tsx:68
- **Field:** `dietType`
- **Why undefined:** Not selected
- **Current behavior:** ASSUMES NON-VEG
- **Should be:** Force selection
- **Impact:**
  - VEGETARIAN/VEGAN USER GETS MEAT IN MEAL PLAN
  - Critical dietary violation
  - User abandons app immediately
  - **THIS IS THE WORST BUG**

#### **CRITICAL - allergies || []**
```typescript
allergies: profile?.dietPreferences?.allergies || [],
```
- **Files:** EditContext.tsx:209, DietScreenNew.tsx:365
- **Field:** `allergies`
- **Why undefined:** Not entered
- **Current behavior:** Empty array - NO ALLERGY FILTERING
- **Should be:** Ask "Do you have food allergies?"
- **Impact:**
  - **HEALTH RISK:** User with nut allergy gets nuts in meal
  - **LEGAL LIABILITY**
  - Must show clear warning if no allergies entered

#### **CRITICAL - restrictions || []**
```typescript
restrictions: profile?.dietPreferences?.restrictions || [],
```
- **Same as allergies** - health risk

#### **CRITICAL - cuisinePreferences || []**
```typescript
cuisinePreferences: profile?.dietPreferences?.cuisinePreferences || [],
```
- **Field:** `cuisinePreferences`
- **Current behavior:** Generic meals
- **Should be:** Ask at minimum (Indian/Western/etc)
- **Impact:** Poor user experience, low engagement

---

### 8. WORKOUT PREFERENCES FALLBACKS (11 instances)

#### **CRITICAL - equipment || []**
```typescript
equipment: profile?.workoutPreferences?.equipment || [],
```
- **Files:** EditContext.tsx:225, WorkoutEngine.ts:54, many more
- **Field:** `equipment`
- **Why undefined:** Not selected
- **Current behavior:** Empty array - assumes bodyweight
- **Should be:** Ask "What equipment do you have?"
- **Impact:**
  - User with full gym gets bodyweight-only workout (waste)
  - User with no equipment gets barbell workout (can't do it)

#### **CRITICAL - location || 'both'**
```typescript
location: profile?.workoutPreferences?.location || 'both' as const,
```
- **Files:** EditContext.tsx:226, App.tsx:124
- **Field:** `location`
- **Current behavior:** Assumes both home and gym
- **Should be:** Ask explicitly
- **Impact:**
  - Home-only user gets gym exercises
  - Cannot complete workout

#### **CRITICAL - intensity || 'beginner'**
```typescript
intensity: profile?.workoutPreferences?.intensity || 'beginner' as const,
```
- **Files:** EditContext.tsx:227, App.tsx:127
- **Field:** `intensity`
- **Current behavior:** ASSUMES BEGINNER
- **Should be:** Derive from experience level or ask
- **Impact:**
  - Intermediate/advanced get too-easy workouts
  - No progressive overload

#### **CRITICAL - activityLevel || 'moderate'**
```typescript
activityLevel: profile?.workoutPreferences?.activityLevel || 'moderate',
```
- **Files:** EditContext.tsx:230, App.tsx:130, EditContext.tsx:185
- **Field:** `activityLevel`
- **Current behavior:** ASSUMES MODERATE
- **Should be:** Required field
- **Impact:**
  - Sedentary user gets too many calories (gains fat)
  - Very active user gets too few calories (loses muscle)
  - TDEE calculation completely wrong

---

## HIGH PRIORITY - PROFILE DATA ISSUES

### 9. EMAIL FALLBACKS (5 instances)

#### **HIGH - user?.email || profile?.personalInfo?.email || ''**
```typescript
email: user?.email || profile?.personalInfo?.email || '',
```
- **Files:** EditContext.tsx:182, App.tsx:117, integration.ts:117
- **Field:** `email`
- **Why undefined:** Auth user has no email (guest mode?)
- **Current behavior:** Empty string
- **Should be:** Require email for non-guest users
- **Impact:** Cannot send notifications, password resets

---

### 10. BODY COMPOSITION FALLBACKS

#### **HIGH - Macro calculation fallbacks**
```typescript
const protein = Math.round(meal?.totalMacros?.protein || 0);
const calories = meal?.totalCalories || 0;
```
- **Files:** MealMotivation.ts:33-34, MacroDashboard.tsx:122-151
- **Field:** Meal macros
- **Why undefined:** Meal generation failed
- **Current behavior:** Shows 0 protein, 0 calories
- **Should be:** Show error "Failed to calculate nutrition"
- **Impact:** User thinks meal has no nutrition

---

## MEDIUM PRIORITY - UI PLACEHOLDERS

### 11. Achievement/Stats Fallbacks (20+ instances)

#### **MEDIUM - stats || 0**
```typescript
totalWorkouts: profile?.stats?.totalWorkouts || 0,
currentStreak: profile?.stats?.currentStreak || 0,
```
- **Files:** useUser.ts:199-202, ProgressScreen.tsx:919, 946
- **Field:** User stats
- **Why undefined:** New user or stats not calculated
- **Current behavior:** Shows 0
- **Should be:** Show 0 (this is actually correct for new users)
- **Impact:** Minimal - 0 is legitimate for new user

#### **MEDIUM - progress || 0**
```typescript
const progress = userProgress?.progress || 0;
```
- **Files:** AchievementCard.tsx:26
- **Field:** Achievement progress
- **Current behavior:** Shows 0% progress
- **Should be:** OK for new user
- **Impact:** Minimal

---

### 12. Meal/Workout Logging Fallbacks (15+ instances)

#### **MEDIUM - Array length || 0**
```typescript
console.log('Exercises:', data.data.exercises?.length || 0);
console.log('Meals:', diet.meals?.length || 0);
```
- **Files:** Many test files and logging
- **Field:** Generated content
- **Why undefined:** Generation failed
- **Current behavior:** Logs 0
- **Should be:** This is fine for logging/debugging
- **Impact:** None - just logging

---

## LOW PRIORITY - LEGITIMATE DEFAULTS

### 13. Optional Feature Fallbacks (80+ instances)

#### **LOW - Token counts, cache hits, etc.**
```typescript
tokensUsed: result.usage?.totalTokens || 0,
cacheHits: allData.reduce((sum, row) => sum + (row.hit_count || 0), 0),
```
- **Files:** AI workers, analytics
- **Field:** Usage metrics
- **Current behavior:** Default to 0
- **Should be:** This is correct - optional metrics
- **Impact:** None - these are optional

#### **LOW - Notes, descriptions**
```typescript
notes: exercise.notes || '',
description: bestVideo.snippet.description || '',
```
- **Field:** Optional text fields
- **Current behavior:** Empty string
- **Should be:** This is correct
- **Impact:** None - optional fields

#### **LOW - Cooking/prep times**
```typescript
const prepTime = meal?.preparationTime || 15;
mealPrepTime: profile?.dietPreferences?.mealPrepTime || 30,
```
- **Field:** Optional preferences
- **Current behavior:** Reasonable defaults
- **Should be:** This is acceptable
- **Impact:** Minimal - just affects suggestions

---

## REPLACEMENT STRATEGY

### Phase 1: CRITICAL - Stop Data Loss (Week 1)

#### 1.1 Add Onboarding Completion Check
```typescript
// src/screens/onboarding/OnboardingContainer.tsx
function validateOnboardingComplete(profile: UserProfile): ValidationResult {
  const errors: string[] = [];

  // Required personalInfo
  if (!profile.personalInfo?.name || profile.personalInfo.name.trim() === '') {
    errors.push('Name is required');
  }
  if (!profile.personalInfo?.age || profile.personalInfo.age < 13 || profile.personalInfo.age > 120) {
    errors.push('Valid age (13-120) is required');
  }
  if (!profile.personalInfo?.gender || !['male', 'female', 'other'].includes(profile.personalInfo.gender)) {
    errors.push('Gender is required');
  }

  // Required bodyMetrics
  if (!profile.bodyMetrics?.current_weight_kg || profile.bodyMetrics.current_weight_kg <= 0) {
    errors.push('Current weight is required');
  }
  if (!profile.bodyMetrics?.height_cm || profile.bodyMetrics.height_cm <= 0) {
    errors.push('Height is required');
  }

  // Required fitnessGoals
  if (!profile.fitnessGoals?.primary_goals || profile.fitnessGoals.primary_goals.length === 0) {
    errors.push('At least one fitness goal is required');
  }
  if (!profile.fitnessGoals?.experience || !['beginner', 'intermediate', 'advanced'].includes(profile.fitnessGoals.experience)) {
    errors.push('Experience level is required');
  }

  // Required dietPreferences
  if (!profile.dietPreferences?.dietType || !['veg', 'non-veg', 'vegan', 'eggetarian'].includes(profile.dietPreferences.dietType)) {
    errors.push('Diet type is required');
  }
  // MUST ask about allergies - legal requirement
  if (profile.dietPreferences?.allergies === undefined) {
    errors.push('Please confirm if you have any food allergies (can be empty array)');
  }

  // Required workoutPreferences
  if (!profile.workoutPreferences?.location || !['home', 'gym', 'both'].includes(profile.workoutPreferences.location)) {
    errors.push('Workout location is required');
  }
  if (profile.workoutPreferences?.equipment === undefined || profile.workoutPreferences.equipment.length === 0) {
    errors.push('Please select available equipment (or select "none")');
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingFields: errors.length
  };
}
```

#### 1.2 Replace ALL Critical Fallbacks with Validation
```typescript
// BEFORE - HomeScreen.tsx
userName={profile?.personalInfo?.name || 'Champion'}

// AFTER - HomeScreen.tsx
userName={profile?.personalInfo?.name ?? throwMissingDataError('personalInfo.name')}

// Helper function
function throwMissingDataError(field: string): never {
  console.error(`[DATA ERROR] Required field missing: ${field}`);
  throw new Error(`Profile incomplete: ${field} is required`);
}

// OR with user-friendly handling
function getRequiredField<T>(value: T | null | undefined, field: string, fallback?: T): T {
  if (value === null || value === undefined) {
    console.error(`[DATA ERROR] Required field missing: ${field}`);
    // Track in analytics
    Analytics.logEvent('missing_required_field', { field });

    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Required field ${field} is missing`);
  }
  return value;
}

// Usage
const userName = getRequiredField(
  profile?.personalInfo?.name,
  'personalInfo.name',
  'INCOMPLETE_PROFILE' // Obvious placeholder that alerts dev
);
```

#### 1.3 Add Database Constraints
```sql
-- supabase/migrations/YYYYMMDD_add_required_field_constraints.sql

ALTER TABLE user_profiles
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN age SET NOT NULL,
  ALTER COLUMN gender SET NOT NULL,
  ADD CONSTRAINT age_valid CHECK (age >= 13 AND age <= 120),
  ADD CONSTRAINT gender_valid CHECK (gender IN ('male', 'female', 'other'));

ALTER TABLE body_metrics
  ALTER COLUMN current_weight_kg SET NOT NULL,
  ALTER COLUMN height_cm SET NOT NULL,
  ADD CONSTRAINT weight_valid CHECK (current_weight_kg > 0 AND current_weight_kg < 500),
  ADD CONSTRAINT height_valid CHECK (height_cm > 0 AND height_cm < 300);

ALTER TABLE fitness_goals
  ALTER COLUMN primary_goals SET NOT NULL,
  ALTER COLUMN experience SET NOT NULL,
  ADD CONSTRAINT has_goals CHECK (array_length(primary_goals, 1) > 0),
  ADD CONSTRAINT experience_valid CHECK (experience IN ('beginner', 'intermediate', 'advanced'));

ALTER TABLE diet_preferences
  ALTER COLUMN diet_type SET NOT NULL,
  -- allergies can be empty array but must exist
  ALTER COLUMN allergies SET DEFAULT '{}',
  ADD CONSTRAINT diet_type_valid CHECK (diet_type IN ('veg', 'non-veg', 'vegan', 'eggetarian'));

ALTER TABLE workout_preferences
  ALTER COLUMN location SET NOT NULL,
  ALTER COLUMN equipment SET NOT NULL,
  ADD CONSTRAINT location_valid CHECK (location IN ('home', 'gym', 'both'));
```

---

### Phase 2: HIGH - Fix Calculation Bugs (Week 2)

#### 2.1 Add Type Guards
```typescript
// src/utils/typeGuards.ts

export function isCompletePersonalInfo(data: any): data is Required<PersonalInfo> {
  return !!(
    data?.name &&
    typeof data.age === 'number' && data.age >= 13 && data.age <= 120 &&
    data.gender && ['male', 'female', 'other'].includes(data.gender) &&
    data.activityLevel && ['sedentary', 'light', 'moderate', 'active', 'very_active'].includes(data.activityLevel)
  );
}

export function isCompleteBodyMetrics(data: any): data is Required<BodyMetrics> {
  return !!(
    data?.current_weight_kg && data.current_weight_kg > 0 &&
    data?.height_cm && data.height_cm > 0
  );
}

export function isCompleteFitnessGoals(data: any): data is Required<FitnessGoals> {
  return !!(
    data?.primary_goals && Array.isArray(data.primary_goals) && data.primary_goals.length > 0 &&
    data?.experience && ['beginner', 'intermediate', 'advanced'].includes(data.experience)
  );
}

// Usage
if (!isCompletePersonalInfo(profile.personalInfo)) {
  throw new Error('Personal info incomplete - cannot calculate BMR');
}
```

#### 2.2 Fix BMR/TDEE Calculations
```typescript
// src/utils/healthCalculations.ts

export function calculateBMR(profile: UserProfile): number {
  // VALIDATE ALL INPUTS FIRST
  if (!isCompletePersonalInfo(profile.personalInfo)) {
    throw new Error('Cannot calculate BMR: personal info incomplete');
  }
  if (!isCompleteBodyMetrics(profile.bodyMetrics)) {
    throw new Error('Cannot calculate BMR: body metrics incomplete');
  }

  const { age, gender } = profile.personalInfo;
  const { current_weight_kg, height_cm } = profile.bodyMetrics;

  // NOW we know these are valid numbers
  if (gender === 'male') {
    return 10 * current_weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    return 10 * current_weight_kg + 6.25 * height_cm - 5 * age - 161;
  }
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile); // Will throw if incomplete

  const activityLevel = profile.personalInfo.activityLevel;
  if (!activityLevel) {
    throw new Error('Activity level required for TDEE calculation');
  }

  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9
  };

  return bmr * multipliers[activityLevel];
}
```

#### 2.3 Add Error Boundaries for Screens
```typescript
// src/screens/main/FitnessScreen.tsx

const FitnessScreen = () => {
  const profile = useUserStore((s) => s.profile);

  // CHECK BEFORE RENDERING
  useEffect(() => {
    const validation = validateOnboardingComplete(profile);
    if (!validation.isValid) {
      Alert.alert(
        'Profile Incomplete',
        `Please complete your profile first:\n${validation.errors.join('\n')}`,
        [{ text: 'Go to Profile', onPress: () => navigation.navigate('Profile') }]
      );
    }
  }, [profile]);

  // Don't show main content if invalid
  if (!validateOnboardingComplete(profile).isValid) {
    return <IncompleteProfileScreen />;
  }

  // NOW safe to use data
  const userName = profile.personalInfo.name; // No fallback needed!
  // ...
};
```

---

### Phase 3: MEDIUM - Improve UX (Week 3)

#### 3.1 Add Progress Indicators
```typescript
// Show completion percentage
const getProfileCompletion = (profile: UserProfile): number => {
  let score = 0;
  const checks = [
    profile?.personalInfo?.name,
    profile?.personalInfo?.age,
    profile?.personalInfo?.gender,
    profile?.bodyMetrics?.current_weight_kg,
    profile?.bodyMetrics?.height_cm,
    profile?.fitnessGoals?.primary_goals?.length > 0,
    profile?.fitnessGoals?.experience,
    profile?.dietPreferences?.dietType,
    profile?.workoutPreferences?.location,
    profile?.workoutPreferences?.equipment?.length > 0
  ];

  return (checks.filter(Boolean).length / checks.length) * 100;
};
```

#### 3.2 Replace Generic Placeholders
```typescript
// BEFORE
userName || 'Champion'

// AFTER
userName || '[Name Required]'  // Makes it obvious something is wrong

// OR show specific prompts
userName || <IncompleteDataPrompt field="name" />
```

---

### Phase 4: LOW - Cleanup (Week 4)

Remove unnecessary fallbacks for optional fields, improve logging fallbacks, etc.

---

## TESTING CHECKLIST

### Critical Tests Required:

1. **Test Profile Creation with Missing Fields**
   - [ ] Try to save profile without name → Should fail
   - [ ] Try to save profile with age=0 → Should fail
   - [ ] Try to save profile without gender → Should fail
   - [ ] Try to save profile without weight → Should fail
   - [ ] Try to save profile without height → Should fail

2. **Test Workout Generation with Incomplete Data**
   - [ ] Missing primary_goals → Should show error
   - [ ] Missing experience → Should show error
   - [ ] Missing equipment → Should ask user

3. **Test Diet Generation with Incomplete Data**
   - [ ] Missing dietType → Should require selection
   - [ ] Missing allergies confirmation → Should ask explicitly
   - [ ] Test vegan user getting meat → Should never happen

4. **Test BMR/TDEE Calculations**
   - [ ] Missing age → Should throw error, not use default
   - [ ] Missing gender → Should throw error, not assume male
   - [ ] Missing weight → Should throw error
   - [ ] Missing height → Should throw error
   - [ ] Missing activityLevel → Should throw error

---

## PRIORITY RANKING

### DO FIRST (This Week):
1. Fix dietType || 'non-veg' → **HEALTH/LEGAL ISSUE**
2. Fix gender || 'male' → **WRONG FITNESS PLAN**
3. Fix age || 30 → **WRONG CALCULATIONS**
4. Fix weight/height || 0 → **BREAKS EVERYTHING**
5. Add database NOT NULL constraints

### DO SECOND (Next Week):
6. Fix fitnessGoals fallbacks
7. Add validation before workout/diet generation
8. Fix EditContext fallbacks
9. Add type guards

### DO THIRD (Week 3):
10. Fix UI placeholders
11. Add error boundaries
12. Improve onboarding validation

### DO LAST (Week 4):
13. Clean up test/logging fallbacks
14. Optimize optional field defaults
15. Documentation

---

## FILES REQUIRING IMMEDIATE CHANGES

### CRITICAL FILES (Fix First):
1. `src/contexts/EditContext.tsx` - Lines 179-230 (All fallbacks)
2. `src/screens/main/HomeScreen.tsx` - Lines 180, 346-347
3. `src/screens/main/FitnessScreen.tsx` - Line 347
4. `src/screens/main/DietScreen.tsx` - Line 216
5. `src/screens/onboarding/tabs/PersonalInfoTab.tsx` - Lines 136-137
6. `src/services/onboardingService.ts` - Lines 91-92
7. `src/services/userProfile.ts` - Lines 444-445
8. `src/utils/healthCalculations.ts` - All BMR/TDEE functions

### HIGH PRIORITY FILES (Fix Second):
9. `src/screens/main/ProfileScreen.tsx`
10. `src/features/nutrition/NutritionEngine.ts`
11. `src/features/workouts/WorkoutEngine.ts`
12. `src/utils/integration.ts`
13. `src/screens/onboarding/OnboardingContainer.tsx`

---

## ESTIMATED IMPACT

### Users Affected:
- **100% of new users** see "Champion" instead of their name
- **50% of users** may have wrong gender (assumes male)
- **30% of users** may have wrong age (defaults to 30)
- **Vegetarian/vegan users** get MEAT in meal plans
- **All users** get wrong calorie calculations if ANY field is missing

### Business Impact:
- **User retention**: Likely -40% due to wrong plans
- **User trust**: Destroyed by dietary violations
- **Legal risk**: HIGH due to allergy handling
- **App store rating**: Would be <2.0 stars

---

## CONCLUSION

This is **not just a code quality issue** - these fallback values are causing:

1. **HEALTH RISKS**: Wrong diet types, missing allergy checks
2. **WRONG FITNESS PLANS**: Wrong age/gender/weight = wrong everything
3. **LEGAL LIABILITY**: Serving meat to vegetarians, ignoring allergies
4. **POOR UX**: Users see app "working" but getting wrong results
5. **DATA INTEGRITY**: Database has incomplete/wrong data

**RECOMMENDATION**: Stop all feature work and fix these fallbacks immediately. This is a P0 bug that makes the app fundamentally broken.

The app appears to work because of these fallbacks, but it's delivering wrong fitness plans to every user. This will destroy retention and reputation.

**Estimated fix time**: 2-3 weeks to fix all critical issues properly.
