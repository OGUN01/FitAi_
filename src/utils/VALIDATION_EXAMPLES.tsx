/**
 * Validation Utilities - Real-World Examples
 *
 * This file demonstrates practical usage of profileValidation utilities
 * in common scenarios throughout the FitAI app.
 */

import { useState } from 'react';
import {
  validatePersonalInfo,
  validateBodyMetrics,
  validateDietPreferences,
  validateWorkoutPreferences,
  validateProfileComplete,
  validateMinimumProfile,
  getRequiredField,
  getRequiredNumericField,
  formatValidationErrors,
  ValidationResult,
} from './profileValidation';

// ==================== EXAMPLE 1: Form Validation ====================

/**
 * Example: Validating a form before submission
 */
export function PersonalInfoFormExample() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    age: 0,
    gender: '',
  });

  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    // Validate form data
    const result = validatePersonalInfo(formData);

    if (!result.isValid) {
      // Show errors to user
      setErrors(result.errors);

      // Optionally, show formatted message
      alert(formatValidationErrors(result));

      return;
    }

    // Clear errors
    setErrors([]);

    // Proceed with submission
    console.log('Form is valid, submitting:', formData);
    // submitPersonalInfo(formData);
  };

  return null; // JSX implementation omitted for brevity
}

// ==================== EXAMPLE 2: Progressive Validation ====================

/**
 * Example: Validating during multi-step onboarding
 */
export function OnboardingStepValidator(step: number, userData: any): ValidationResult {
  switch (step) {
    case 1: // Personal Info Step
      return validatePersonalInfo(userData.personalInfo);

    case 2: // Body Metrics Step
      return validateBodyMetrics(userData.bodyMetrics);

    case 3: // Diet Preferences Step
      return validateDietPreferences(userData.dietPreferences);

    case 4: // Workout Preferences Step
      return validateWorkoutPreferences(userData.workoutPreferences);

    case 5: // Review Step - validate everything
      return validateProfileComplete(userData);

    default:
      return { isValid: true, missingFields: [], errors: [] };
  }
}

/**
 * Example: Preventing navigation to next step if validation fails
 */
export function handleOnboardingNext(
  currentStep: number,
  userData: any,
  navigation: any
) {
  const result = OnboardingStepValidator(currentStep, userData);

  if (!result.isValid) {
    // Show validation errors
    alert(`Please complete the following:\n${result.errors.join('\n')}`);
    return false;
  }

  // Allow navigation to next step
  navigation.navigate('OnboardingStep', { step: currentStep + 1 });
  return true;
}

// ==================== EXAMPLE 3: Data Access with Validation ====================

/**
 * Example: Safely calculating BMI with validation
 */
export function calculateBMI(profile: any): number {
  try {
    // Validate and extract height
    const heightCm = getRequiredNumericField(
      profile.bodyMetrics?.height_cm,
      'height_cm',
      100,
      250,
      'BMI Calculation'
    );

    // Validate and extract weight
    const weightKg = getRequiredNumericField(
      profile.bodyMetrics?.current_weight_kg,
      'current_weight_kg',
      30,
      300,
      'BMI Calculation'
    );

    // Calculate BMI
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);

    return Math.round(bmi * 10) / 10;
  } catch (error) {
    // Log detailed error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cannot calculate BMI:', errorMessage);

    // Re-throw to force caller to handle
    throw new Error('Unable to calculate BMI: Missing required body metrics');
  }
}

/**
 * Example: Displaying user greeting with validation
 */
export function getGreeting(profile: any): string {
  try {
    // Validate personal info exists
    const result = validatePersonalInfo(profile.personalInfo);

    if (!result.isValid) {
      throw new Error(`Cannot display greeting: ${result.errors.join(', ')}`);
    }

    // Safe to access first_name now
    const firstName = getRequiredField(
      profile.personalInfo.first_name,
      'first_name',
      'Greeting'
    );

    const hour = new Date().getHours();

    if (hour < 12) {
      return `Good morning, ${firstName}!`;
    } else if (hour < 18) {
      return `Good afternoon, ${firstName}!`;
    } else {
      return `Good evening, ${firstName}!`;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating greeting:', errorMessage);

    // Don't use fallback like "Good morning, Champion!"
    // Instead, redirect to profile completion
    throw error;
  }
}

// ==================== EXAMPLE 4: Conditional UI Rendering ====================

/**
 * Example: Determining which onboarding step to show
 */
export function determineIncompleteStep(profile: any): string | null {
  // Check personal info
  const personalResult = validatePersonalInfo(profile.personalInfo);
  if (!personalResult.isValid) {
    return 'PersonalInfo';
  }

  // Check body metrics
  const bodyResult = validateBodyMetrics(profile.bodyMetrics);
  if (!bodyResult.isValid) {
    return 'BodyMetrics';
  }

  // Check diet preferences
  const dietResult = validateDietPreferences(profile.dietPreferences);
  if (!dietResult.isValid) {
    return 'DietPreferences';
  }

  // Check workout preferences
  const workoutResult = validateWorkoutPreferences(profile.workoutPreferences);
  if (!workoutResult.isValid) {
    return 'WorkoutPreferences';
  }

  // All complete
  return null;
}

/**
 * Example: Showing profile completion status
 */
export function getProfileCompletionStatus(profile: any): {
  percentage: number;
  missingFields: string[];
  nextAction: string;
} {
  const result = validateProfileComplete(profile);

  if (result.isValid) {
    return {
      percentage: 100,
      missingFields: [],
      nextAction: 'Your profile is complete!',
    };
  }

  // Calculate completion percentage
  const totalFields = 10; // Total required fields across all sections
  const missingCount = result.missingFields.length;
  const percentage = Math.round(((totalFields - missingCount) / totalFields) * 100);

  // Determine next action based on missing fields
  let nextAction = 'Complete your profile';
  if (result.missingFields.some((f) => ['first_name', 'last_name', 'age'].includes(f))) {
    nextAction = 'Add your personal information';
  } else if (result.missingFields.some((f) => ['height_cm', 'current_weight_kg'].includes(f))) {
    nextAction = 'Add your body measurements';
  } else if (result.missingFields.includes('diet_type')) {
    nextAction = 'Set your diet preferences';
  } else if (result.missingFields.includes('fitness_level')) {
    nextAction = 'Set your workout preferences';
  }

  return {
    percentage,
    missingFields: result.missingFields,
    nextAction,
  };
}

// ==================== EXAMPLE 5: API Request Validation ====================

/**
 * Example: Validating profile before sending to API
 */
export async function submitProfileToAPI(profile: any): Promise<void> {
  // Validate profile is complete before API call
  const result = validateProfileComplete(profile);

  if (!result.isValid) {
    throw new Error(
      `Cannot submit incomplete profile. Missing: ${result.missingFields.join(', ')}`
    );
  }

  try {
    // Make API request
    // const response = await fetch('/api/profile', {
    //   method: 'POST',
    //   body: JSON.stringify(profile),
    // });

    console.log('Profile submitted successfully');
  } catch (error) {
    console.error('API submission failed:', error);
    throw error;
  }
}

/**
 * Example: Validating minimum requirements before allowing app access
 */
export function checkMinimumRequirements(profile: any, navigation: any): boolean {
  const result = validateMinimumProfile(profile);

  if (!result.isValid) {
    // Block app access
    console.error('Minimum profile requirements not met:', result.errors);

    // Show modal explaining what's needed
    alert(
      `Please complete the following before accessing the app:\n${result.errors.join('\n')}`
    );

    // Redirect to onboarding
    navigation.navigate('Onboarding');

    return false;
  }

  // Allow app access
  return true;
}

// ==================== EXAMPLE 6: Error Boundary Integration ====================

/**
 * Example: Using validation in error boundaries
 */
export function ProfileRequiredWrapper({ profile, children }: any) {
  try {
    // Validate profile before rendering children
    const result = validateMinimumProfile(profile);

    if (!result.isValid) {
      // Show fallback UI
      return (
        <div>
          <h2>Profile Incomplete</h2>
          <p>Please complete the following:</p>
          <ul>
            {result.errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
          <button onClick={() => console.log('Navigate to profile')}>
            Complete Profile
          </button>
        </div>
      );
    }

    // Profile valid - render children
    return children;
  } catch (error) {
    // Handle validation errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Profile validation error:', error);

    return (
      <div>
        <h2>Error</h2>
        <p>Unable to validate profile: {errorMessage}</p>
      </div>
    );
  }
}

// ==================== EXAMPLE 7: Real-Time Field Validation ====================

/**
 * Example: Validating individual fields as user types
 */
export function validateAgeField(age: number | null | undefined): {
  isValid: boolean;
  error: string | null;
} {
  try {
    getRequiredNumericField(age, 'age', 13, 120);
    return { isValid: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation failed';
    return { isValid: false, error: errorMessage };
  }
}

/**
 * Example: Form with real-time validation
 */
export function AgeInputWithValidation() {
  const [age, setAge] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAgeChange = (value: string) => {
    const numValue = parseInt(value, 10);
    setAge(numValue);

    // Validate in real-time
    const validation = validateAgeField(numValue);
    setError(validation.error);
  };

  return null; // JSX implementation omitted for brevity
}

// ==================== EXAMPLE 8: Batch Validation ====================

/**
 * Example: Validating multiple users at once
 */
export function validateUserBatch(users: any[]): {
  valid: any[];
  invalid: Array<{ user: any; errors: string[] }>;
} {
  const valid: any[] = [];
  const invalid: Array<{ user: any; errors: string[] }> = [];

  for (const user of users) {
    const result = validateProfileComplete(user);

    if (result.isValid) {
      valid.push(user);
    } else {
      invalid.push({
        user,
        errors: result.errors,
      });
    }
  }

  return { valid, invalid };
}

// ==================== EXAMPLE 9: Custom Validation Rules ====================

/**
 * Example: Extending validation with custom business logic
 */
export function validateWeightGoal(profile: any): ValidationResult {
  const errors: string[] = [];
  const missingFields: string[] = [];

  try {
    const currentWeight = getRequiredNumericField(
      profile.bodyMetrics?.current_weight_kg,
      'current_weight_kg',
      30,
      300
    );

    const targetWeight = profile.bodyMetrics?.target_weight_kg;

    if (!targetWeight) {
      errors.push('Target weight is not set');
      missingFields.push('target_weight_kg');
    } else if (Math.abs(currentWeight - targetWeight) > 50) {
      errors.push(
        'Target weight change is too extreme (max 50kg). Please consult a healthcare professional.'
      );
      missingFields.push('target_weight_kg');
    } else if (currentWeight === targetWeight) {
      errors.push('Target weight must be different from current weight');
      missingFields.push('target_weight_kg');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Validation error';
    errors.push(errorMessage);
    missingFields.push('current_weight_kg');
  }

  return {
    isValid: errors.length === 0,
    missingFields,
    errors,
  };
}

// ==================== EXAMPLE 10: Testing Helper ====================

/**
 * Example: Creating test fixtures with valid data
 */
export function createValidProfileFixture(): any {
  return {
    personalInfo: {
      first_name: 'John',
      last_name: 'Doe',
      age: 30,
      gender: 'male',
      name: 'John Doe',
    },
    bodyMetrics: {
      height_cm: 175,
      current_weight_kg: 75,
      target_weight_kg: 70,
      activity_level: 'moderate',
    },
    dietPreferences: {
      diet_type: 'balanced',
      allergies: [],
      dietary_restrictions: [],
      disliked_foods: [],
    },
    workoutPreferences: {
      fitness_level: 'intermediate',
      workout_days_per_week: 4,
      preferred_workout_types: ['strength', 'cardio'],
      available_equipment: ['dumbbells', 'barbell'],
    },
  };
}

/**
 * Example: Creating invalid profile fixtures for testing error handling
 */
export function createInvalidProfileFixture(): any {
  return {
    personalInfo: {
      first_name: '', // Invalid: empty
      age: 10, // Invalid: too young
      gender: 'invalid', // Invalid: not in allowed list
    },
    bodyMetrics: {
      height_cm: 50, // Invalid: too short
      current_weight_kg: 500, // Invalid: too heavy
    },
    dietPreferences: {
      // Missing diet_type
    },
    workoutPreferences: {
      fitness_level: 'expert', // Invalid: not in allowed list
      workout_days_per_week: 10, // Invalid: too many days
    },
  };
}

// ==================== SUMMARY ====================

/**
 * Key Takeaways:
 *
 * 1. Always validate before using data
 * 2. Never use fallback values that mask missing data
 * 3. Provide clear error messages to users
 * 4. Handle validation errors explicitly
 * 5. Use try-catch when using getRequiredField helpers
 * 6. Use ValidationResult for form validation
 * 7. Validate early, fail fast
 * 8. Combine validators for complex validation
 * 9. Test both valid and invalid data
 * 10. Document validation requirements
 */
