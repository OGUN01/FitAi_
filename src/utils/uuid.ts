/**
 * UUID Generation Utility for FitAI
 * Provides cross-platform UUID generation with fallbacks for guest user IDs
 */

// Try to use crypto.randomUUID() if available (React Native 0.70+)
let cryptoUUID: (() => string) | null = null;
try {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    cryptoUUID = crypto.randomUUID.bind(crypto);
  }
} catch (error) {
  console.log("crypto.randomUUID not available, will use fallback");
}

// Expo UUID fallback
let expoUUID: (() => string) | null = null;
try {
  const uuid = require("expo-modules-core/src/uuid/uuid").default;
  if (uuid && uuid.v4) {
    expoUUID = uuid.v4;
  }
} catch (error) {
  console.log("Expo UUID not available, will use manual fallback");
}

/**
 * Generates a v4 UUID using the best available method
 * Priority: crypto.randomUUID() > Expo UUID > manual fallback
 */
export const generateUUID = (): string => {
  // First try crypto.randomUUID()
  if (cryptoUUID) {
    try {
      return cryptoUUID();
    } catch (error) {
      console.warn("crypto.randomUUID() failed, trying fallback");
    }
  }

  // Then try Expo UUID
  if (expoUUID) {
    try {
      return expoUUID();
    } catch (error) {
      console.warn("Expo UUID failed, using manual fallback");
    }
  }

  // Manual fallback implementation (RFC 4122 v4 compliant)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Generates a guest user ID with proper UUID format
 * Format: Standard UUID prefixed with 'guest-' for identification
 */
export const generateGuestId = (): string => {
  const uuid = generateUUID();
  return `guest-${uuid}`;
};

/**
 * Validates if a string is a valid UUID format
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Checks if an ID is a guest ID
 */
export const isGuestId = (id: string): boolean => {
  return id.startsWith("guest-") && isValidUUID(id.substring(6));
};

/**
 * Converts old-format guest IDs to new UUID format
 * Maintains consistency for existing users while fixing database issues
 */
export const migrateGuestId = (oldId: string): string => {
  // If it's already a valid guest UUID, return as-is
  if (isGuestId(oldId)) {
    return oldId;
  }

  // If it's an old format guest ID, convert to UUID
  if (oldId.startsWith("guest_")) {
    console.log(`🔄 Migrating old guest ID: ${oldId}`);
    return generateGuestId();
  }

  // If it's a regular UUID, return as-is
  if (isValidUUID(oldId)) {
    return oldId;
  }

  // For any other format, generate new guest ID
  console.log(`🔄 Invalid ID format, generating new guest ID: ${oldId}`);
  return generateGuestId();
};
