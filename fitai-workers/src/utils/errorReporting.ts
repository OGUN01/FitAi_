/**
 * Comprehensive Error Reporting System
 *
 * NO FALLBACKS - All errors are exposed immediately for debugging
 *
 * Purpose:
 * - Log detailed errors and warnings to analytics
 * - Create standardized error responses
 * - Prepare for future monitoring service integration (DataDog, Sentry, etc.)
 *
 * Critical Rules:
 * - All errors are detailed and actionable
 * - Error codes use SCREAMING_SNAKE_CASE
 * - Include context (meal name, food name, allergen, etc.)
 * - NO FALLBACK logic in this file
 */

// ==========================================
// Type Definitions
// ==========================================

/**
 * Critical validation error that prevents plan generation
 */
export interface ValidationError {
  /** Severity level - always CRITICAL for blocking errors */
  severity: 'CRITICAL';

  /** Error code in SCREAMING_SNAKE_CASE */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Optional meal name where error occurred */
  meal?: string;

  /** Optional food name where error occurred */
  food?: string;

  /** Optional allergen that was detected */
  allergen?: string;

  /** Optional diet type that was violated */
  dietType?: string;

  /** Optional current value (for drift errors) */
  current?: number;

  /** Optional target value (for drift errors) */
  target?: number;

  /** Optional drift percentage (for drift errors) */
  drift?: number;

  /** Any additional context */
  [key: string]: any;
}

/**
 * Non-blocking validation warning for quality issues
 */
export interface ValidationWarning {
  /** Severity level - WARNING for quality issues, INFO for suggestions */
  severity: 'WARNING' | 'INFO';

  /** Warning code in SCREAMING_SNAKE_CASE */
  code: string;

  /** Human-readable warning message */
  message: string;

  /** Recommended action to take */
  action?: string;

  /** Any additional context */
  [key: string]: any;
}

/**
 * Result of validation process
 */
export interface ValidationResult {
  /** Whether validation passed (no critical errors) */
  isValid: boolean;

  /** List of critical errors that block generation */
  errors: ValidationError[];

  /** List of non-blocking quality warnings */
  warnings: ValidationWarning[];
}

// ==========================================
// Analytics Logging
// ==========================================

/**
 * Logs events to analytics system
 *
 * Currently logs to console (Cloudflare logs)
 * Prepared for future integration with monitoring services
 *
 * @param eventName - Name of the event (e.g., 'diet_validation_failed')
 * @param data - Event data with context
 *
 * @example
 * ```typescript
 * await logToAnalytics('diet_quality_warning', {
 *   userId: 'user_123',
 *   warnings: validationResult.warnings,
 *   timestamp: new Date().toISOString(),
 * });
 * ```
 */
export async function logToAnalytics(
  eventName: string,
  data: Record<string, any>
): Promise<void> {
  try {
    // Add timestamp to all events
    const eventData = {
      ...data,
      timestamp: new Date().toISOString(),
      event: eventName,
    };

    // Log to console (Cloudflare logs)
    console.log(`[Analytics] ${eventName}:`, JSON.stringify(eventData, null, 2));

    // TODO: Integration with external monitoring services
    // Uncomment and configure when ready:
    //
    // // DataDog example:
    // await fetch('https://http-intake.logs.datadoghq.com/api/v2/logs', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'DD-API-KEY': env.DATADOG_API_KEY,
    //   },
    //   body: JSON.stringify({
    //     ddsource: 'fitai-workers',
    //     service: 'diet-generation',
    //     ...eventData,
    //   }),
    // });
    //
    // // Sentry example:
    // Sentry.captureMessage(eventName, {
    //   level: 'info',
    //   extra: eventData,
    // });

  } catch (error) {
    // Don't throw - logging failures shouldn't break the app
    console.error('[Analytics] Failed to log event:', error);
  }
}

// ==========================================
// Error Creation
// ==========================================

/**
 * Creates a standardized detailed error response
 *
 * @param code - Error code in SCREAMING_SNAKE_CASE
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 *
 * @returns Standardized error response object
 *
 * @example
 * ```typescript
 * return createDetailedError(
 *   'ALLERGEN_DETECTED',
 *   'Meal plan contains allergen "peanuts"',
 *   {
 *     meal: 'Breakfast',
 *     food: 'Peanut Butter Toast',
 *     allergen: 'peanuts',
 *   }
 * );
 * ```
 */
export function createDetailedError(
  code: string,
  message: string,
  details?: any
) {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      help: 'Check server logs for more information. If this persists, contact support.',
    },
  };
}

/**
 * Creates a detailed error response with validation errors
 *
 * @param errors - List of validation errors
 *
 * @returns Standardized error response with validation details
 *
 * @example
 * ```typescript
 * const validationResult = validateDietPlan(aiResponse, metrics, prefs);
 * if (!validationResult.isValid) {
 *   return createValidationErrorResponse(validationResult.errors);
 * }
 * ```
 */
export function createValidationErrorResponse(errors: ValidationError[]) {
  // Group errors by type
  const allergenErrors = errors.filter(e => e.code.includes('ALLERGEN'));
  const dietErrors = errors.filter(e => e.code.includes('DIET_TYPE'));
  const calorieErrors = errors.filter(e => e.code.includes('CALORIE'));
  const otherErrors = errors.filter(e =>
    !allergenErrors.includes(e) &&
    !dietErrors.includes(e) &&
    !calorieErrors.includes(e)
  );

  // Create user-friendly summary
  let summary = 'AI-generated plan failed validation:\n';

  if (allergenErrors.length > 0) {
    summary += `\n❌ Allergen violations (${allergenErrors.length}):`;
    allergenErrors.forEach(e => {
      summary += `\n  - ${e.message}`;
    });
  }

  if (dietErrors.length > 0) {
    summary += `\n❌ Diet type violations (${dietErrors.length}):`;
    dietErrors.forEach(e => {
      summary += `\n  - ${e.message}`;
    });
  }

  if (calorieErrors.length > 0) {
    summary += `\n❌ Calorie issues (${calorieErrors.length}):`;
    calorieErrors.forEach(e => {
      summary += `\n  - ${e.message}`;
    });
  }

  if (otherErrors.length > 0) {
    summary += `\n❌ Other issues (${otherErrors.length}):`;
    otherErrors.forEach(e => {
      summary += `\n  - ${e.message}`;
    });
  }

  return createDetailedError(
    'VALIDATION_FAILED',
    summary,
    {
      errors,
      totalErrors: errors.length,
      categories: {
        allergen: allergenErrors.length,
        dietType: dietErrors.length,
        calorie: calorieErrors.length,
        other: otherErrors.length,
      },
    }
  );
}

// ==========================================
// Error Codes Reference
// ==========================================

/**
 * Standard error codes used throughout the system
 *
 * CRITICAL ERRORS (block generation):
 * - ALLERGEN_DETECTED: Direct allergen found in food
 * - ALLERGEN_ALIAS_DETECTED: Allergen alias found in food
 * - DIET_TYPE_VIOLATION: Food violates diet type (e.g., meat in vegan)
 * - EXTREME_CALORIE_DRIFT: Calories >30% off target
 * - MISSING_REQUIRED_FIELDS: Missing critical data in meal/food
 * - INCOMPLETE_FOOD_DATA: Food missing nutrition information
 * - EXERCISE_ID_INVALID: Exercise ID not found in database
 * - EXERCISE_GIF_MISSING: Exercise GIF URL not available
 *
 * WARNINGS (quality issues):
 * - MODERATE_CALORIE_DRIFT: Calories 10-30% off target (auto-adjustable)
 * - LOW_PROTEIN: Protein <80% of target
 * - LOW_VARIETY: Less than 60% unique foods
 * - EXERCISE_DIFFICULTY_MISMATCH: Exercise difficulty doesn't match user level
 *
 * INFO (suggestions):
 * - PORTION_ADJUSTED: Portions were automatically adjusted
 * - CUISINE_DETECTED: Detected user's regional cuisine
 */
export const ERROR_CODES = {
  // Critical errors
  ALLERGEN_DETECTED: 'ALLERGEN_DETECTED',
  ALLERGEN_ALIAS_DETECTED: 'ALLERGEN_ALIAS_DETECTED',
  DIET_TYPE_VIOLATION: 'DIET_TYPE_VIOLATION',
  EXTREME_CALORIE_DRIFT: 'EXTREME_CALORIE_DRIFT',
  MISSING_REQUIRED_FIELDS: 'MISSING_REQUIRED_FIELDS',
  INCOMPLETE_FOOD_DATA: 'INCOMPLETE_FOOD_DATA',
  EXERCISE_ID_INVALID: 'EXERCISE_ID_INVALID',
  EXERCISE_GIF_MISSING: 'EXERCISE_GIF_MISSING',

  // Warnings
  MODERATE_CALORIE_DRIFT: 'MODERATE_CALORIE_DRIFT',
  LOW_PROTEIN: 'LOW_PROTEIN',
  LOW_VARIETY: 'LOW_VARIETY',
  EXERCISE_DIFFICULTY_MISMATCH: 'EXERCISE_DIFFICULTY_MISMATCH',

  // Info
  PORTION_ADJUSTED: 'PORTION_ADJUSTED',
  CUISINE_DETECTED: 'CUISINE_DETECTED',
} as const;

// ==========================================
// Exports
// ==========================================

export type { ValidationError, ValidationWarning, ValidationResult };
export { logToAnalytics, createDetailedError, createValidationErrorResponse, ERROR_CODES };
