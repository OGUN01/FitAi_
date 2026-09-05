/**
 * Auth Utilities - Simple utility functions for auth state access
 *
 * ARCHITECTURE FIX: Extracted from StoreCoordinator to break circular dependencies.
 * This module uses lazy imports to avoid import cycles.
 *
 * Import this module instead of StoreCoordinator when you only need:
 * - getCurrentUserId()
 * - getUserIdOrGuest()
 * - isAuthenticated()
 * - requireUserId()
 */

// LAZY IMPORT: Avoid circular dependency with stores
// Stores can safely import this module because we don't import stores at the top level
let _authStoreModule: any = null;
const getAuthStore = () => {
  if (!_authStoreModule) {
    _authStoreModule = require("../stores/authStore");
  }
  return _authStoreModule.useAuthStore;
};

/**
 * Get the current authenticated user ID
 * Single point of access for user authentication state
 */
export const getCurrentUserId = (): string | null => {
  const authStore = getAuthStore();
  if (!authStore) {
    // Auth store module not yet initialized (import-cycle / early module load).
    // Return null so callers fall back to guest/no-user paths instead of crashing.
    return null;
  }
  const authState = authStore.getState();
  return authState.user?.id ?? null;
};

/**
 * Get the current user or throw if not authenticated
 */
export const requireUserId = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error("User must be authenticated for this operation");
  }
  return userId;
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getCurrentUserId() !== null;
};

/**
 * Get user ID with fallback for guest mode
 */
export const getUserIdOrGuest = (): string => {
  return getCurrentUserId() ?? "guest";
};

/**
 * P1-6: Returns the real authenticated user id, or null when the user is a
 * guest / not authenticated. Callers use this to SKIP offline-queue sync for
 * guests (matching the pattern in analyticsData, achievementData,
 * crudOperations, extraWorkoutService). Guest IDs ("guest-...") must never
 * reach Supabase writes — RLS rejects them and they pollute the retry queue.
 *
 * Extracted here because it was copy-pasted identically in nutritionStore.ts,
 * fitnessStore.ts and hydrationStore.ts — single source of truth for the
 * guest-id-shape check.
 */
export const getSyncableUserId = (): string | null => {
  const userId = getCurrentUserId();
  if (!userId) return null;
  if (userId.startsWith("guest")) return null;
  return userId;
};
