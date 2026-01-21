/**
 * Email Validator - Single Source of Truth
 *
 * Consolidates 4+ duplicate email validation implementations
 * Provides consistent email validation across the application
 *
 * Replaced implementations from:
 * - src/services/api.ts (apiUtils.isValidEmail)
 * - src/utils/profileValidation.ts (validateEmail)
 * - src/screens/onboarding/LoginScreen.tsx (inline regex)
 * - src/screens/auth/AuthenticationExample.tsx (validateEmail)
 * - Various other inline validations
 */

/**
 * Standard email regex pattern (RFC 5322 simplified)
 * Validates most common email formats
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * More strict email regex for production use
 * Based on RFC 5322 Official Standard
 */
const EMAIL_REGEX_STRICT =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export interface EmailValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Validate email format (basic validation)
 *
 * @param email - Email address to validate
 * @returns True if email format is valid
 *
 * @example
 * isValidEmail('user@example.com'); // Returns true
 * isValidEmail('invalid'); // Returns false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return false;
  }

  return EMAIL_REGEX.test(trimmedEmail);
}

/**
 * Validate email format with strict rules
 * Uses RFC 5322 compliant regex
 *
 * @param email - Email address to validate
 * @returns True if email format is valid
 *
 * @example
 * isValidEmailStrict('user@example.com'); // Returns true
 * isValidEmailStrict('user+tag@example.co.uk'); // Returns true
 */
export function isValidEmailStrict(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }

  const trimmedEmail = email.trim();

  if (trimmedEmail.length === 0) {
    return false;
  }

  return EMAIL_REGEX_STRICT.test(trimmedEmail);
}

/**
 * Validate email with detailed error messages
 *
 * @param email - Email address to validate
 * @param strict - Use strict validation rules (default: false)
 * @returns Validation result with errors
 *
 * @example
 * const result = validateEmail('user@example.com');
 * // Returns { isValid: true, errors: [] }
 *
 * const result2 = validateEmail('invalid');
 * // Returns { isValid: false, errors: ['Invalid email format'] }
 */
export function validateEmail(
  email: string,
  strict: boolean = false,
): EmailValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if email is provided
  if (!email || typeof email !== "string") {
    errors.push("Email is required");
    return { isValid: false, errors };
  }

  const trimmedEmail = email.trim();

  // Check if email is empty
  if (trimmedEmail.length === 0) {
    errors.push("Email cannot be empty");
    return { isValid: false, errors };
  }

  // Check length constraints
  if (trimmedEmail.length > 254) {
    errors.push("Email is too long (max 254 characters)");
  }

  // Check for @ symbol
  if (!trimmedEmail.includes("@")) {
    errors.push("Email must contain @ symbol");
    return { isValid: false, errors };
  }

  // Check for multiple @ symbols
  const atCount = (trimmedEmail.match(/@/g) || []).length;
  if (atCount > 1) {
    errors.push("Email must contain only one @ symbol");
    return { isValid: false, errors };
  }

  // Split into local and domain parts
  const [localPart, domainPart] = trimmedEmail.split("@");

  // Validate local part (before @)
  if (!localPart || localPart.length === 0) {
    errors.push("Email must have a username before @");
  } else if (localPart.length > 64) {
    errors.push("Email username is too long (max 64 characters)");
  }

  // Validate domain part (after @)
  if (!domainPart || domainPart.length === 0) {
    errors.push("Email must have a domain after @");
  } else {
    // Check for domain extension
    if (!domainPart.includes(".")) {
      errors.push("Email domain must contain a dot (.)");
    }

    // Check domain length
    if (domainPart.length > 253) {
      errors.push("Email domain is too long (max 253 characters)");
    }

    // Validate domain extension
    const domainParts = domainPart.split(".");
    const extension = domainParts[domainParts.length - 1];

    if (extension.length < 2) {
      errors.push("Email domain extension must be at least 2 characters");
    }

    // Check for common typos
    const commonDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
    ];
    const similarDomain = findSimilarDomain(domainPart, commonDomains);

    if (similarDomain) {
      warnings.push(`Did you mean ${localPart}@${similarDomain}?`);
    }
  }

  // Apply regex validation
  const isValid = strict
    ? EMAIL_REGEX_STRICT.test(trimmedEmail)
    : EMAIL_REGEX.test(trimmedEmail);

  if (!isValid && errors.length === 0) {
    errors.push("Invalid email format");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Normalize email address (trim, lowercase)
 *
 * @param email - Email address to normalize
 * @returns Normalized email address
 *
 * @example
 * normalizeEmail('  User@Example.COM  '); // Returns 'user@example.com'
 */
export function normalizeEmail(email: string): string {
  if (!email || typeof email !== "string") {
    return "";
  }

  return email.trim().toLowerCase();
}

/**
 * Check if email is from a disposable email provider
 *
 * @param email - Email address to check
 * @returns True if email is from a disposable provider
 *
 * @example
 * isDisposableEmail('user@tempmail.com'); // Returns true
 * isDisposableEmail('user@gmail.com'); // Returns false
 */
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    "tempmail.com",
    "throwaway.email",
    "guerrillamail.com",
    "10minutemail.com",
    "mailinator.com",
    "trashmail.com",
    "temp-mail.org",
    "getnada.com",
  ];

  const normalizedEmail = normalizeEmail(email);
  const domain = normalizedEmail.split("@")[1];

  return disposableDomains.includes(domain);
}

/**
 * Extract domain from email
 *
 * @param email - Email address
 * @returns Domain part of email
 *
 * @example
 * getEmailDomain('user@example.com'); // Returns 'example.com'
 */
export function getEmailDomain(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  const parts = normalizedEmail.split("@");

  return parts.length === 2 ? parts[1] : "";
}

/**
 * Find similar domain from a list (for typo detection)
 * Uses Levenshtein distance to find similar domains
 *
 * @param domain - Domain to check
 * @param commonDomains - List of common domains
 * @returns Similar domain if found, null otherwise
 */
function findSimilarDomain(
  domain: string,
  commonDomains: string[],
): string | null {
  const threshold = 2; // Maximum edit distance

  for (const commonDomain of commonDomains) {
    const distance = levenshteinDistance(
      domain.toLowerCase(),
      commonDomain.toLowerCase(),
    );
    if (distance > 0 && distance <= threshold) {
      return commonDomain;
    }
  }

  return null;
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for typo detection
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Mask email for display (privacy)
 *
 * @param email - Email address to mask
 * @returns Masked email address
 *
 * @example
 * maskEmail('user@example.com'); // Returns 'u***@example.com'
 * maskEmail('longusername@example.com'); // Returns 'lon***@example.com'
 */
export function maskEmail(email: string): string {
  const normalizedEmail = normalizeEmail(email);
  const [localPart, domainPart] = normalizedEmail.split("@");

  if (!localPart || !domainPart) {
    return email;
  }

  const visibleChars = Math.min(3, localPart.length);
  const maskedLocal = localPart.substring(0, visibleChars) + "***";

  return `${maskedLocal}@${domainPart}`;
}

/**
 * Default export for convenience
 */
export default {
  isValidEmail,
  isValidEmailStrict,
  validateEmail,
  normalizeEmail,
  isDisposableEmail,
  getEmailDomain,
  maskEmail,
};
