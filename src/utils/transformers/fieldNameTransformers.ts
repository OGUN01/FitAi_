/**
 * Field Name Transformers
 *
 * Provides utilities to transform field names between camelCase and snake_case
 * at database boundaries to maintain consistency.
 *
 * Usage:
 * - toSnakeCase(): Use when WRITING to database
 * - toCamelCase(): Use when READING from database
 */

/**
 * Convert a string from camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, ""); // Remove leading underscore if any
}

/**
 * Convert a string from snake_case to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Transform all keys in an object from camelCase to snake_case
 * Recursively handles nested objects and arrays
 *
 * @param obj - Object with camelCase keys
 * @returns Object with snake_case keys
 */
export function keysToSnakeCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToSnakeCase(item)) as any;
  }

  // Handle non-objects (primitives, dates, etc.)
  if (typeof obj !== "object" || obj instanceof Date) {
    return obj;
  }

  // Handle objects
  const transformed: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);

    // Recursively transform nested objects/arrays
    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date)
    ) {
      transformed[snakeKey] = keysToSnakeCase(value);
    } else {
      transformed[snakeKey] = value;
    }
  }

  return transformed;
}

/**
 * Transform all keys in an object from snake_case to camelCase
 * Recursively handles nested objects and arrays
 *
 * @param obj - Object with snake_case keys
 * @returns Object with camelCase keys
 */
export function keysToCamelCase<T = any>(obj: any): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToCamelCase(item)) as any;
  }

  // Handle non-objects (primitives, dates, etc.)
  if (typeof obj !== "object" || obj instanceof Date) {
    return obj;
  }

  // Handle objects
  const transformed: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);

    // Recursively transform nested objects/arrays
    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date)
    ) {
      transformed[camelKey] = keysToCamelCase(value);
    } else {
      transformed[camelKey] = value;
    }
  }

  return transformed;
}

/**
 * Transform specific fields in an object to snake_case
 * Useful for partial transformations
 *
 * @param obj - Object to transform
 * @param fields - Array of field names to transform
 * @returns Object with specified fields in snake_case
 */
export function transformFieldsToSnakeCase<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
): any {
  const result = { ...obj };

  for (const field of fields) {
    if (field in obj) {
      const snakeField = toSnakeCase(field as string);
      result[snakeField as keyof T] = obj[field];

      // Remove original camelCase field if different
      if (snakeField !== field) {
        delete result[field];
      }
    }
  }

  return result;
}

/**
 * Transform specific fields in an object to camelCase
 * Useful for partial transformations
 *
 * @param obj - Object to transform
 * @param fields - Array of field names to transform
 * @returns Object with specified fields in camelCase
 */
export function transformFieldsToCamelCase<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[],
): any {
  const result = { ...obj };

  for (const field of fields) {
    if (field in obj) {
      const camelField = toCamelCase(field as string);
      result[camelField as keyof T] = obj[field];

      // Remove original snake_case field if different
      if (camelField !== field) {
        delete result[field];
      }
    }
  }

  return result;
}

/**
 * Create a database-safe object by transforming keys to snake_case
 * and removing undefined values
 *
 * @param obj - Object to prepare for database
 * @returns Database-safe object with snake_case keys
 */
export function prepareDatabaseWrite<T = any>(obj: any): T {
  const snakeCased = keysToSnakeCase(obj);

  // Remove undefined values (keep null for database nulls)
  const cleaned: any = {};
  for (const [key, value] of Object.entries(snakeCased)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Transform a database response to application format
 * Converts snake_case keys to camelCase
 *
 * @param obj - Database response object
 * @returns Application-safe object with camelCase keys
 */
export function transformDatabaseRead<T = any>(obj: any): T {
  return keysToCamelCase(obj);
}

// Type-safe wrapper for common database operations
export interface DatabaseTransformers {
  toDb: typeof prepareDatabaseWrite;
  fromDb: typeof transformDatabaseRead;
  keysToSnake: typeof keysToSnakeCase;
  keysToCamel: typeof keysToCamelCase;
}

export const db: DatabaseTransformers = {
  toDb: prepareDatabaseWrite,
  fromDb: transformDatabaseRead,
  keysToSnake: keysToSnakeCase,
  keysToCamel: keysToCamelCase,
};

// Export convenience functions
export { prepareDatabaseWrite as toDb, transformDatabaseRead as fromDb };
