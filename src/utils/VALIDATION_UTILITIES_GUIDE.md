# Validation Utilities Guide

## Overview

The `profileValidation.ts` module provides comprehensive validation utilities with **ZERO FALLBACKS**. This guide explains how to use these utilities throughout the application.

## Core Principles

1. **No Fallback Values** - Missing data throws errors or returns detailed validation results
2. **Clear Error Messages** - Every error indicates exactly what's missing and why
3. **Type Safety** - All validators are fully typed
4. **Composability** - Validators can be combined for complex validation scenarios

## Key Functions

### 1. Required Field Helpers

#### `getRequiredField<T>(value, fieldName, context?)`

Gets a required field or throws an error if missing.

```typescript
import { getRequiredField } from './profileValidation';

// Example: Get first name (throws if missing)
const firstName = getRequiredField(
  user.first_name,
  'first_name',
  'UserProfile'
);

// Throws: "Required field missing: first_name (UserProfile)"
```

#### `getRequiredNumericField(value, fieldName, min, max, context?)`

Gets a required numeric field with range validation.

```typescript
import { getRequiredNumericField } from './profileValidation';

// Example: Get age with validation
const age = getRequiredNumericField(
  user.age,
  'age',
  13,
  120,
  'UserProfile'
);

// Throws if:
// - age is null/undefined: "Required numeric field missing: age (UserProfile)"
// - age is out of range: "age must be between 13 and 120, got 5 (UserProfile)"
```

#### `getRequiredArrayField<T>(value, fieldName, minLength?, context?)`

Gets a required array field with optional length validation.

```typescript
import { getRequiredArrayField } from './profileValidation';

// Example: Get allergies array
const allergies = getRequiredArrayField(
  user.allergies,
  'allergies',
  1,
  'DietPreferences'
);

// Throws if:
// - allergies is null/undefined: "Required array field missing: allergies (DietPreferences)"
// - allergies is not an array: "Invalid array value for allergies: expected array, got object"
// - allergies.length < 1: "allergies must have at least 1 items, got 0"
```

### 2. Section Validators

Each validator returns a `ValidationResult`:

```typescript
interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}
```

#### `validatePersonalInfo(personalInfo)`

Validates personal information section.

```typescript
import { validatePersonalInfo } from './profileValidation';

const result = validatePersonalInfo(user.personalInfo);

if (!result.isValid) {
  console.error('Validation failed:', result.errors);
  // ['First name is required', 'Age must be between 13 and 120']

  console.error('Missing fields:', result.missingFields);
  // ['first_name', 'age']
}
```

**Required fields:**
- `first_name` (non-empty string)
- `last_name` (non-empty string)
- `age` (number, 13-120)
- `gender` (one of: 'male', 'female', 'other')

#### `validateBodyMetrics(bodyMetrics)`

Validates body metrics section.

```typescript
import { validateBodyMetrics } from './profileValidation';

const result = validateBodyMetrics(user.bodyMetrics);

if (!result.isValid) {
  console.error('Validation failed:', result.errors);
}
```

**Required fields:**
- `height_cm` (number, 100-250)
- `current_weight_kg` (number, 30-300)

**Optional but recommended:**
- `target_weight_kg`
- `activity_level`

#### `validateDietPreferences(dietPrefs)`

Validates diet preferences section.

```typescript
import { validateDietPreferences } from './profileValidation';

const result = validateDietPreferences(user.dietPreferences);
```

**Required fields:**
- `diet_type` (non-empty string)

**Optional arrays (validated if present):**
- `allergies` (must be array)
- `dietary_restrictions` (must be array)
- `disliked_foods` (must be array)

#### `validateWorkoutPreferences(workoutPrefs)`

Validates workout preferences section.

```typescript
import { validateWorkoutPreferences } from './profileValidation';

const result = validateWorkoutPreferences(user.workoutPreferences);
```

**Required fields:**
- `fitness_level` (one of: 'beginner', 'intermediate', 'advanced')
- `workout_days_per_week` (number, 1-7)

**Optional arrays (validated if present):**
- `preferred_workout_types` (must be array)
- `available_equipment` (must be array)

### 3. Composite Validators

#### `validateProfileComplete(profile)`

Validates entire profile has all required data.

```typescript
import { validateProfileComplete } from './profileValidation';

const result = validateProfileComplete(userProfile);

if (!result.isValid) {
  // Show errors to user
  alert(`Please complete your profile:\n${result.errors.join('\n')}`);

  // Navigate to missing section
  if (result.missingFields.includes('first_name')) {
    navigateToPersonalInfo();
  }
}
```

**Validates:**
- Personal Info (first_name, last_name, age, gender)
- Body Metrics (height_cm, current_weight_kg)
- Diet Preferences (diet_type)
- Workout Preferences (fitness_level, workout_days_per_week)

#### `validateMinimumProfile(profile)`

Validates minimum required fields to proceed.

```typescript
import { validateMinimumProfile } from './profileValidation';

// Less strict - only checks critical fields
const result = validateMinimumProfile(userProfile);

if (result.isValid) {
  // Can proceed with basic functionality
  allowAppAccess();
} else {
  // Block app access until minimum data provided
  redirectToOnboarding();
}
```

**Required minimum:**
- `first_name`
- `age` (minimum 13)
- `height_cm` (minimum 100)
- `current_weight_kg` (minimum 30)

### 4. Field-Specific Validators

#### `validateEmail(email)`

Validates email format.

```typescript
import { validateEmail } from './profileValidation';

const result = validateEmail(userEmail);

if (!result.isValid) {
  showError(result.errors[0]); // "Valid email address is required"
}
```

#### `validatePassword(password)`

Validates password strength.

```typescript
import { validatePassword } from './profileValidation';

const result = validatePassword(userPassword);

if (!result.isValid) {
  // Show all password requirements not met
  result.errors.forEach(error => showError(error));
  // - "Password must be at least 8 characters long"
  // - "Password must contain at least one uppercase letter"
  // - etc.
}
```

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

#### `validateDateOfBirth(dob)`

Validates date of birth (alternative to age).

```typescript
import { validateDateOfBirth } from './profileValidation';

const result = validateDateOfBirth(userDOB);

if (!result.isValid) {
  showError(result.errors[0]);
}
```

**Requirements:**
- Valid date format
- Age between 13 and 120

### 5. Utility Functions

#### `combineValidationResults(...results)`

Combines multiple validation results.

```typescript
import {
  combineValidationResults,
  validatePersonalInfo,
  validateBodyMetrics
} from './profileValidation';

const personalResult = validatePersonalInfo(user.personalInfo);
const bodyResult = validateBodyMetrics(user.bodyMetrics);

const combined = combineValidationResults(personalResult, bodyResult);

if (!combined.isValid) {
  console.log('All errors:', combined.errors);
  console.log('All missing fields:', combined.missingFields);
}
```

#### `hasCriticalErrors(result)`

Checks if validation result has critical errors.

```typescript
import { hasCriticalErrors, validateBodyMetrics } from './profileValidation';

const result = validateBodyMetrics(user.bodyMetrics);

if (hasCriticalErrors(result)) {
  // Block submission
  preventFormSubmit();
} else {
  // Allow submission (possibly with warnings)
  allowFormSubmit();
}
```

#### `formatValidationErrors(result)`

Formats validation errors into user-friendly message.

```typescript
import { formatValidationErrors, validateProfileComplete } from './profileValidation';

const result = validateProfileComplete(userProfile);

if (!result.isValid) {
  const message = formatValidationErrors(result);
  alert(message);

  // Output:
  // "Please fix the following issues:
  // - First name is required
  // - Age must be between 13 and 120
  // - Height must be between 100 and 250 cm"
}
```

## Usage Patterns

### Pattern 1: Form Validation

```typescript
import { validatePersonalInfo, formatValidationErrors } from './profileValidation';

function handleSubmitPersonalInfo(formData: any) {
  const result = validatePersonalInfo(formData);

  if (!result.isValid) {
    // Show errors to user
    setErrorMessage(formatValidationErrors(result));

    // Highlight missing fields
    result.missingFields.forEach(field => {
      highlightField(field);
    });

    return;
  }

  // Proceed with submission
  submitPersonalInfo(formData);
}
```

### Pattern 2: Progressive Validation

```typescript
import {
  validatePersonalInfo,
  validateBodyMetrics,
  validateDietPreferences,
  combineValidationResults
} from './profileValidation';

function validateOnboardingStep(step: number, data: any) {
  let result: ValidationResult;

  switch (step) {
    case 1:
      result = validatePersonalInfo(data.personalInfo);
      break;
    case 2:
      result = validateBodyMetrics(data.bodyMetrics);
      break;
    case 3:
      result = validateDietPreferences(data.dietPreferences);
      break;
    default:
      result = { isValid: true, missingFields: [], errors: [] };
  }

  return result;
}
```

### Pattern 3: Data Access with Validation

```typescript
import { getRequiredField, getRequiredNumericField } from './profileValidation';

function calculateBMI(profile: any) {
  try {
    const heightCm = getRequiredNumericField(
      profile.bodyMetrics?.height_cm,
      'height_cm',
      100,
      250,
      'BMI Calculation'
    );

    const weightKg = getRequiredNumericField(
      profile.bodyMetrics?.current_weight_kg,
      'current_weight_kg',
      30,
      300,
      'BMI Calculation'
    );

    const heightM = heightCm / 100;
    return weightKg / (heightM * heightM);

  } catch (error) {
    // Log error with context
    console.error('Cannot calculate BMI:', error.message);

    // Don't return a fallback BMI - handle error appropriately
    throw error;
  }
}
```

### Pattern 4: Conditional Navigation

```typescript
import { validateProfileComplete } from './profileValidation';

function checkProfileCompletion(navigation: any) {
  const result = validateProfileComplete(userProfile);

  if (!result.isValid) {
    // Determine which section to navigate to
    if (result.missingFields.some(f => ['first_name', 'last_name', 'age', 'gender'].includes(f))) {
      navigation.navigate('PersonalInfo');
    } else if (result.missingFields.some(f => ['height_cm', 'current_weight_kg'].includes(f))) {
      navigation.navigate('BodyMetrics');
    } else if (result.missingFields.includes('diet_type')) {
      navigation.navigate('DietPreferences');
    } else {
      navigation.navigate('WorkoutPreferences');
    }

    // Show message
    showToast(`Please complete: ${result.missingFields.join(', ')}`);

    return false;
  }

  return true;
}
```

## Error Handling Best Practices

### 1. Always Catch and Handle Errors

```typescript
// BAD: No error handling
const name = getRequiredField(user.first_name, 'first_name');

// GOOD: Handle errors appropriately
try {
  const name = getRequiredField(user.first_name, 'first_name');
  displayName(name);
} catch (error) {
  console.error('Cannot display name:', error.message);
  redirectToProfileCompletion();
}
```

### 2. Use Validation Results for UI Feedback

```typescript
// BAD: Silent failure
const result = validatePersonalInfo(data);
if (result.isValid) {
  submit(data);
}

// GOOD: Provide feedback
const result = validatePersonalInfo(data);
if (!result.isValid) {
  setErrors(result.errors);
  setMissingFields(result.missingFields);
  showValidationMessage();
} else {
  submit(data);
}
```

### 3. Validate Early, Fail Fast

```typescript
// BAD: Validate at the end
function processProfile(profile: any) {
  const name = computeName(profile);
  const bmi = computeBMI(profile);
  const goals = computeGoals(profile);

  // Validation happens too late
  const result = validateProfileComplete(profile);
  if (!result.isValid) {
    throw new Error('Invalid profile');
  }
}

// GOOD: Validate first
function processProfile(profile: any) {
  // Validate before processing
  const result = validateProfileComplete(profile);
  if (!result.isValid) {
    throw new Error(`Invalid profile: ${result.errors.join(', ')}`);
  }

  // Now safe to process
  const name = computeName(profile);
  const bmi = computeBMI(profile);
  const goals = computeGoals(profile);
}
```

## Integration with userHelpers.ts

The `userHelpers.ts` module now uses these validation utilities:

```typescript
import { getUserDisplayName } from './userHelpers';

try {
  const name = getUserDisplayName(user.personalInfo);
  console.log(`Hello, ${name}!`);
} catch (error) {
  // Error contains detailed message from validation
  console.error(error.message);
  // "Personal info validation failed: First name is required, Age must be between 13 and 120"

  // Redirect to profile completion
  navigation.navigate('CompleteProfile');
}
```

## Testing Validation

```typescript
import {
  validatePersonalInfo,
  validateBodyMetrics,
  validateProfileComplete
} from './profileValidation';

describe('Profile Validation', () => {
  it('should reject missing first name', () => {
    const result = validatePersonalInfo({
      last_name: 'Doe',
      age: 25,
      gender: 'male'
    });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('first_name');
    expect(result.errors).toContain('First name is required');
  });

  it('should reject invalid age', () => {
    const result = validatePersonalInfo({
      first_name: 'John',
      last_name: 'Doe',
      age: 10, // Too young
      gender: 'male'
    });

    expect(result.isValid).toBe(false);
    expect(result.missingFields).toContain('age');
    expect(result.errors).toContain('Age must be between 13 and 120');
  });

  it('should validate complete profile', () => {
    const result = validateProfileComplete(validProfile);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
```

## Migration Guide

### Before (with fallbacks)

```typescript
// OLD: Silent fallback
const name = user.first_name || 'Champion';

// OLD: Default value
const age = user.age || 18;
```

### After (no fallbacks)

```typescript
import { getRequiredField, getRequiredNumericField } from './profileValidation';

// NEW: Explicit error handling
try {
  const name = getRequiredField(user.first_name, 'first_name', 'Greeting');
  console.log(`Hello, ${name}!`);
} catch (error) {
  // Handle missing data appropriately
  console.error(error.message);
  promptUserToCompleteProfile();
}

// NEW: Range validation
try {
  const age = getRequiredNumericField(user.age, 'age', 13, 120, 'Age Validation');
  if (age < 18) {
    showParentalConsentForm();
  }
} catch (error) {
  console.error(error.message);
  redirectToProfileSetup();
}
```

## Summary

The validation utilities enforce a **NO FALLBACK** policy throughout the application:

- Use `getRequiredField()` when you need data and cannot proceed without it
- Use section validators (`validatePersonalInfo()`, etc.) for form validation
- Use `validateProfileComplete()` before major operations that need full profile
- Always handle validation errors explicitly
- Never use default/fallback values that mask missing data

This approach ensures data integrity and makes data flow problems visible immediately rather than hiding them with fallbacks.
