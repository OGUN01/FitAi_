import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { LoginCredentials, RegisterCredentials, AuthUser } from '../types/user';
import { AuthResponse } from '../services/auth';

export interface UseAuthReturn {
  // State
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  isInitialized: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  logout: () => Promise<AuthResponse>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  resendEmailVerification: (email: string) => Promise<AuthResponse>;
  signInWithGoogle: () => Promise<any>;
  linkGoogleAccount: () => Promise<any>;
  unlinkGoogleAccount: () => Promise<any>;
  isGoogleLinked: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * Custom hook for authentication
 * Provides access to auth state and actions
 */
export const useAuth = (): UseAuthReturn => {
  const {
    user,
    isLoading,
    isAuthenticated,
    error,
    isInitialized,
    login,
    register,
    logout,
    resetPassword,
    resendEmailVerification,
    signInWithGoogle,
    linkGoogleAccount,
    unlinkGoogleAccount,
    isGoogleLinked,
    clearError,
    initialize,
  } = useAuthStore();

  // Initialize auth on first use
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  return {
    user,
    isLoading,
    isAuthenticated,
    error,
    isInitialized,
    login,
    register,
    logout,
    resetPassword,
    resendEmailVerification,
    signInWithGoogle,
    linkGoogleAccount,
    unlinkGoogleAccount,
    isGoogleLinked,
    clearError,
  };
};

/**
 * Hook to check if user is authenticated
 * Returns boolean indicating auth status
 */
export const useIsAuthenticated = (): boolean => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated;
};

/**
 * Hook to get current user
 * Returns current user or null
 */
export const useCurrentUser = (): AuthUser | null => {
  const user = useAuthStore((state) => state.user);
  return user;
};

/**
 * Hook to check if auth is loading
 * Useful for showing loading states
 */
export const useAuthLoading = (): boolean => {
  const isLoading = useAuthStore((state) => state.isLoading);
  return isLoading;
};

/**
 * Hook to get auth error
 * Returns current error or null
 */
export const useAuthError = (): string | null => {
  const error = useAuthStore((state) => state.error);
  return error;
};

/**
 * Hook for auth actions only
 * Useful when you only need actions without state
 */
export const useAuthActions = () => {
  const {
    login,
    register,
    logout,
    resetPassword,
    resendEmailVerification,
    clearError,
  } = useAuthStore();

  return {
    login,
    register,
    logout,
    resetPassword,
    resendEmailVerification,
    clearError,
  };
};

export default useAuth;
