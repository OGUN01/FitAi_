/**
 * Profile Data Validation Engine
 * Ensures data integrity and provides comprehensive validation for all profile data types
 * Used for both local storage and remote sync operations
 */

import {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  UserProfile,
  ValidationResult,
  DataValidationSchema,
} from '../types/profileData';

class ProfileValidator implements DataValidationSchema {
  // ============================================================================
  // PERSONAL INFO VALIDATION
  // ============================================================================

  validatePersonalInfo(data: Partial<PersonalInfo>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (data.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    } else if (data.name.trim().length > 50) {
      errors.push('Name must be less than 50 characters');
    }

    if (!data.age) {
      errors.push('Age is required');
    } else {
      const age = parseInt(String((data as any).age), 10);
      if (isNaN(age) || age < 13 || age > 120) {
        errors.push('Age must be between 13 and 120');
      } else if (age < 18) {
        warnings.push('Users under 18 may need parental consent');
      }
    }

    if (!data.gender) {
      errors.push('Gender is required');
    } else if (!['male', 'female', 'other'].includes(data.gender)) {
      errors.push('Gender must be male, female, or other');
    }

    if (!(data as any).height) {
      errors.push('Height is required');
    } else {
      const height = parseFloat((data as any).height);
      if (isNaN(height) || height < 100 || height > 250) {
        errors.push('Height must be between 100cm and 250cm');
      }
    }

    if (!(data as any).weight) {
      errors.push('Weight is required');
    } else {
      const weight = parseFloat((data as any).weight);
      if (isNaN(weight) || weight < 30 || weight > 300) {
        errors.push('Weight must be between 30kg and 300kg');
      }
    }

    if (!(data as any).activityLevel) {
      errors.push('Activity level is required');
    } else if (
      !['sedentary', 'light', 'moderate', 'active', 'very_active'].includes((data as any).activityLevel)
    ) {
      errors.push('Invalid activity level');
    }

    // Optional fields validation
    if (data.email && !this.isValidEmail(data.email)) {
      errors.push('Invalid email format');
    }

    if ((data as any).phoneNumber && !this.isValidPhoneNumber((data as any).phoneNumber)) {
      warnings.push('Phone number format may be invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // FITNESS GOALS VALIDATION
  // ============================================================================

  validateFitnessGoals(data: Partial<FitnessGoals>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.primaryGoals || data.primaryGoals.length === 0) {
      errors.push('At least one primary goal is required');
    } else if (data.primaryGoals.length > 5) {
      warnings.push('Having too many goals may reduce focus');
    }

    if (!data.experience) {
      errors.push('Experience level is required');
    } else if (!['beginner', 'intermediate', 'advanced'].includes(data.experience)) {
      errors.push('Invalid experience level');
    }

    if (!data.timeCommitment) {
      errors.push('Time commitment is required');
    }

    // Optional fields validation
    if ((data as any).targetWeight) {
      const weight = parseFloat((data as any).targetWeight);
      if (isNaN(weight) || weight < 30 || weight > 300) {
        errors.push('Target weight must be between 30kg and 300kg');
      }
    }

    if ((data as any).timeframe && !this.isValidTimeframe((data as any).timeframe)) {
      warnings.push('Timeframe may be unrealistic');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // DIET PREFERENCES VALIDATION
  // ============================================================================

  validateDietPreferences(data: Partial<DietPreferences>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.diet_type) {
      errors.push('Diet type is required');
    } else if (
      !['vegetarian', 'vegan', 'non-veg', 'pescatarian', 'keto', 'paleo', 'mediterranean'].includes(
        data.diet_type
      )
    ) {
      errors.push('Invalid diet type');
    }

    // Optional fields validation - cookingSkill
    if ((data as any).cookingSkill && !['beginner', 'intermediate', 'advanced'].includes((data as any).cookingSkill)) {
      errors.push('Invalid cooking skill level');
    }

    // Optional fields validation - mealPrepTime
    if ((data as any).mealPrepTime && !['quick', 'moderate', 'extended'].includes((data as any).mealPrepTime)) {
      errors.push('Invalid meal preparation time preference');
    }

    // Array fields validation
    if (data.allergies && !Array.isArray(data.allergies)) {
      errors.push('Allergies must be an array');
    }

    if ((data as any).cuisinePreferences && !Array.isArray((data as any).cuisinePreferences)) {
      errors.push('Cuisine preferences must be an array');
    }

    if (data.restrictions && !Array.isArray(data.restrictions)) {
      errors.push('Dietary restrictions must be an array');
    }

    if ((data as any).dislikes && !Array.isArray((data as any).dislikes)) {
      errors.push('Dislikes must be an array');
    }

    // Logical validation
    if (data.diet_type === 'vegan' && data.allergies?.includes('dairy')) {
      warnings.push('Vegan diet already excludes dairy');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // WORKOUT PREFERENCES VALIDATION
  // ============================================================================

  validateWorkoutPreferences(data: Partial<WorkoutPreferences>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.workoutType || data.workoutType.length === 0) {
      errors.push('At least one workout type is required');
    }

    if (!data.equipment || data.equipment.length === 0) {
      errors.push('Equipment preferences are required');
    }

    if (!data.location) {
      errors.push('Workout location is required');
    } else if (!['home', 'gym', 'outdoor', 'mixed'].includes(data.location)) {
      errors.push('Invalid workout location');
    }

    if (!data.intensity) {
      errors.push('Workout intensity is required');
    } else if (!['low', 'moderate', 'high'].includes(data.intensity)) {
      errors.push('Invalid workout intensity');
    }

    if (!data.duration) {
      errors.push('Workout duration is required');
    }

    // Frequency validation
    if ((data as any).frequency !== undefined) {
      if ((data as any).frequency < 1 || (data as any).frequency > 7) {
        errors.push('Workout frequency must be between 1 and 7 days per week');
      } else if ((data as any).frequency > 6) {
        warnings.push('Training 7 days a week may lead to overtraining');
      }
    }

    // Logical validation
    if (data.location === 'home' && data.equipment?.includes('heavy_weights')) {
      warnings.push('Heavy weights may not be suitable for home workouts');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // USER PROFILE VALIDATION
  // ============================================================================

  validateUserProfile(data: Partial<UserProfile>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!data.userId) {
      errors.push('User ID is required');
    }

    // Validate sub-components if they exist
    if (data.personalInfo) {
      const personalInfoResult = this.validatePersonalInfo(data.personalInfo);
      errors.push(...personalInfoResult.errors);
      warnings.push(...personalInfoResult.warnings);
    }

    if (data.fitnessGoals) {
      const fitnessGoalsResult = this.validateFitnessGoals(data.fitnessGoals);
      errors.push(...fitnessGoalsResult.errors);
      warnings.push(...fitnessGoalsResult.warnings);
    }

    if (data.dietPreferences) {
      const dietPreferencesResult = this.validateDietPreferences(data.dietPreferences);
      errors.push(...dietPreferencesResult.errors);
      warnings.push(...dietPreferencesResult.warnings);
    }

    if (data.workoutPreferences) {
      const workoutPreferencesResult = this.validateWorkoutPreferences(data.workoutPreferences);
      errors.push(...workoutPreferencesResult.errors);
      warnings.push(...workoutPreferencesResult.warnings);
    }

    // Profile completeness validation
    if (data.profileCompleteness !== undefined) {
      if (data.profileCompleteness < 0 || data.profileCompleteness > 100) {
        errors.push('Profile completeness must be between 0 and 100');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // UTILITY VALIDATION METHODS
  // ============================================================================

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private isValidTimeframe(timeframe: string): boolean {
    // Basic validation for timeframe strings like "3 months", "6 weeks", etc.
    const timeframeRegex = /^\d+\s+(days?|weeks?|months?|years?)$/i;
    return timeframeRegex.test(timeframe);
  }

  // ============================================================================
  // PROFILE COMPLETENESS CALCULATION
  // ============================================================================

  calculateProfileCompleteness(profile: Partial<UserProfile>): number {
    let completeness = 0;
    const maxScore = 100;

    // Personal Info (40 points)
    if (profile.personalInfo) {
      const personalInfoResult = this.validatePersonalInfo(profile.personalInfo);
      if (personalInfoResult.isValid) {
        completeness += 40;
      } else {
        // Partial credit based on filled fields
        const requiredFields = ['name', 'age', 'gender', 'height', 'weight', 'activityLevel'];
        const filledFields = requiredFields.filter(
          (field) => profile.personalInfo![field as keyof PersonalInfo]
        );
        completeness += (filledFields.length / requiredFields.length) * 40;
      }
    }

    // Fitness Goals (25 points)
    if (profile.fitnessGoals) {
      const fitnessGoalsResult = this.validateFitnessGoals(profile.fitnessGoals);
      if (fitnessGoalsResult.isValid) {
        completeness += 25;
      } else {
        // Partial credit
        completeness += 10;
      }
    }

    // Diet Preferences (20 points)
    if (profile.dietPreferences) {
      const dietPreferencesResult = this.validateDietPreferences(profile.dietPreferences);
      if (dietPreferencesResult.isValid) {
        completeness += 20;
      } else {
        // Partial credit
        completeness += 8;
      }
    }

    // Workout Preferences (15 points)
    if (profile.workoutPreferences) {
      const workoutPreferencesResult = this.validateWorkoutPreferences(profile.workoutPreferences);
      if (workoutPreferencesResult.isValid) {
        completeness += 15;
      } else {
        // Partial credit
        completeness += 6;
      }
    }

    return Math.min(Math.round(completeness), maxScore);
  }
}

// Export singleton instance
export const profileValidator = new ProfileValidator();
export { ProfileValidator };
