/**
 * User Helper Utilities
 *
 * NO FALLBACK POLICY:
 * - These functions throw errors when data is missing
 * - Fallbacks like "Champion" mask data flow issues
 * - Proper error handling forces us to fix root causes
 *
 * Uses profileValidation.ts for strict validation with zero fallbacks
 */

import { PersonalInfoData } from "../types/onboarding";
import { getRequiredField, validatePersonalInfo } from "./profileValidation";

/**
 * Validates personal info before accessing fields
 * @throws Error if validation fails with detailed error messages
 */
function ensureValidPersonalInfo(
  personalInfo: PersonalInfoData | null | undefined,
): PersonalInfoData {
  const validationResult = validatePersonalInfo(personalInfo);

  if (!validationResult.isValid) {
    throw new Error(
      `Personal info validation failed: ${validationResult.errors.join(", ")}`,
    );
  }

  return personalInfo!;
}

/**
 * Get user's display name from PersonalInfo data
 *
 * Priority:
 * 1. Use `name` field if present (computed full name from database)
 * 2. Compute from `first_name` + `last_name` if available
 * 3. THROW ERROR if both are missing (NO "Champion" fallback)
 *
 * @param personalInfo - User's personal info from profile
 * @returns Display name string
 * @throws Error if name cannot be determined
 */
export function getUserDisplayName(
  personalInfo: PersonalInfoData | null | undefined,
): string {
  // Validate using strict validation utilities
  const validated = ensureValidPersonalInfo(personalInfo);

  // Priority 1: Use name field if present
  if (validated.name && validated.name.trim()) {
    return validated.name.trim();
  }

  // Priority 2: Compute from first_name + last_name
  const firstName = getRequiredField(
    validated.first_name,
    "first_name",
    "getUserDisplayName",
  ).trim();
  const lastName = validated.last_name?.trim() || "";

  if (lastName) {
    return `${firstName} ${lastName}`;
  }

  return firstName;
}

/**
 * Get user's first name for casual greetings
 *
 * @param personalInfo - User's personal info from profile
 * @returns First name string
 * @throws Error if first name cannot be determined
 */
export function getUserFirstName(
  personalInfo: PersonalInfoData | null | undefined,
): string {
  // Validate using strict validation utilities
  const validated = ensureValidPersonalInfo(personalInfo);

  // Try first_name field first (required by validation)
  const firstName = getRequiredField(
    validated.first_name,
    "first_name",
    "getUserFirstName",
  );

  return firstName.trim();
}

/**
 * Get user's initials for avatar display
 *
 * @param personalInfo - User's personal info from profile
 * @returns Initials string (1-2 characters)
 * @throws Error if initials cannot be determined
 */
export function getUserInitials(
  personalInfo: PersonalInfoData | null | undefined,
): string {
  // Validate using strict validation utilities
  const validated = ensureValidPersonalInfo(personalInfo);

  // Get required first name (validated)
  const firstName = getRequiredField(
    validated.first_name,
    "first_name",
    "getUserInitials",
  ).trim();
  const lastName = validated.last_name?.trim() || "";

  // Compute initials
  if (lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  return firstName.charAt(0).toUpperCase();
}
