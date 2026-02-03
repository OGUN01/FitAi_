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
