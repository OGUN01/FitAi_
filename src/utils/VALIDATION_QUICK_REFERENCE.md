# Validation System - Quick Reference

## Import Statement
```typescript
import {
  getRequiredField,
  getRequiredNumericField,
  validatePersonalInfo,
  validateProfileComplete,
  formatValidationErrors
} from './utils/profileValidation';
```

## Common Use Cases

### 1. Get Required Field
```typescript
// Throws if missing
const firstName = getRequiredField(user.first_name, 'first_name');
```

### 2. Get Numeric Field with Range
```typescript
// Throws if missing or out of range
const age = getRequiredNumericField(user.age, 'age', 13, 120);
```

### 3. Validate Form Section
```typescript
const result = validatePersonalInfo(formData);
if (!result.isValid) {
  alert(formatValidationErrors(result));
  return;
}
// Proceed with submission
```

### 4. Validate Complete Profile
```typescript
const result = validateProfileComplete(profile);
if (result.isValid) {
  submitProfile(profile);
} else {
  showErrors(result.errors);
}
```

### 5. Safe Data Access
```typescript
try {
  const firstName = getRequiredField(user.first_name, 'first_name');
  console.log(`Hello, ${firstName}!`);
} catch (error) {
  console.error(error.message);
  redirectToProfileSetup();
}
```

## All Validators

| Validator | Purpose | Required Fields |
|-----------|---------|-----------------|
| `validatePersonalInfo()` | Personal information | first_name, last_name, age (13-120), gender |
| `validateBodyMetrics()` | Body measurements | height_cm (100-250), current_weight_kg (30-300) |
| `validateDietPreferences()` | Diet settings | diet_type |
| `validateWorkoutPreferences()` | Workout settings | fitness_level, workout_days_per_week (1-7) |
| `validateProfileComplete()` | All sections | All above fields |
| `validateMinimumProfile()` | Minimum required | first_name, age, height_cm, current_weight_kg |
| `validateEmail()` | Email format | Valid email address |
| `validatePassword()` | Password strength | 8+ chars, uppercase, lowercase, number |

## Validation Result

```typescript
interface ValidationResult {
  isValid: boolean;        // true if all valid
  missingFields: string[]; // Array of field names that failed
  errors: string[];        // Human-readable error messages
}
```

## Error Handling

### Option 1: Try-Catch (for getRequired* helpers)
```typescript
try {
  const value = getRequiredField(data, 'field');
  useValue(value);
} catch (error) {
  handleError(error.message);
}
```

### Option 2: Check Result (for validate* functions)
```typescript
const result = validatePersonalInfo(data);
if (!result.isValid) {
  showErrors(result.errors);
  highlightFields(result.missingFields);
}
```

## Utilities

```typescript
// Format errors for display
const message = formatValidationErrors(result);

// Combine multiple results
const combined = combineValidationResults(result1, result2);

// Check for critical errors
if (hasCriticalErrors(result)) {
  blockSubmission();
}
```

## DO's and DON'Ts

### ✅ DO
- Validate data before using it
- Handle validation errors explicitly
- Show clear error messages to users
- Use try-catch with getRequired* helpers

### ❌ DON'T
- Use fallback values (e.g., "Champion")
- Ignore validation results
- Catch errors and silently continue
- Access data without validation

## Quick Examples

### Form Validation
```typescript
const handleSubmit = () => {
  const result = validatePersonalInfo(formData);
  if (!result.isValid) {
    setErrors(result.errors);
    return;
  }
  submit(formData);
};
```

### Navigation Guard
```typescript
const checkProfile = () => {
  const result = validateMinimumProfile(profile);
  if (!result.isValid) {
    navigation.navigate('CompleteProfile');
    return false;
  }
  return true;
};
```

### Calculate with Validation
```typescript
const calculateBMI = () => {
  try {
    const height = getRequiredNumericField(
      profile.height_cm, 'height_cm', 100, 250
    );
    const weight = getRequiredNumericField(
      profile.current_weight_kg, 'current_weight_kg', 30, 300
    );
    return weight / ((height / 100) ** 2);
  } catch (error) {
    console.error('Cannot calculate BMI:', error.message);
    throw error;
  }
};
```

## See Also
- **Comprehensive Guide**: `VALIDATION_UTILITIES_GUIDE.md`
- **Real Examples**: `VALIDATION_EXAMPLES.tsx`
- **Tests**: `__tests__/profileValidation.test.ts`
- **Summary**: `VALIDATION_SYSTEM_COMPLETE.md` (in project root)
