import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, LoginCredentials, RegisterCredentials } from '../types/user';
import { authService, AuthResponse } from '../services/auth';

interface AuthState {
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
  initialize: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null,
      isInitialized: false,

      // Actions
      login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.login(credentials);

          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: response.error || 'Login failed',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.register(credentials);

          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: response.error || 'Registration failed',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      logout: async (): Promise<AuthResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.logout();

          if (response.success) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Logout failed',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Logout failed';
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      resetPassword: async (email: string): Promise<AuthResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.resetPassword(email);

          set({
            isLoading: false,
            error: response.success ? null : response.error || 'Password reset failed',
          });

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      resendEmailVerification: async (email: string): Promise<AuthResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.resendEmailVerification(email);

          set({
            isLoading: false,
            error: response.success ? null : response.error || 'Email verification failed',
          });

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: AuthUser | null) => {
        set({
          user,
          isAuthenticated: user !== null,
        });
      },

      initialize: async () => {
        if (get().isInitialized) {
          console.log('🔄 AuthStore: Already initialized, skipping...');
          return;
        }

        console.log('🚀 AuthStore: Initializing auth store...');
        set({ isLoading: true });

        try {
          const response = await authService.restoreSession();

          if (response.success && response.user) {
            console.log('✅ AuthStore: Session restored successfully for user:', response.user.email);
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
          } else {
            console.log('❌ AuthStore: No valid session found:', response.error);
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
          }

          // Set up auth state change listener
          console.log('👂 AuthStore: Setting up auth state change listener');
          authService.onAuthStateChange((user) => {
            console.log('🔄 AuthStore: Auth state changed, user:', user?.email || 'null');
            get().setUser(user);
          });
        } catch (error) {
          console.log('❌ AuthStore: Initialization failed:', error);
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error: error instanceof Error ? error.message : 'Initialization failed',
          });
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.signInWithGoogle();

          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || 'Google Sign-In failed',
            });
          }

          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Google Sign-In failed';
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      linkGoogleAccount: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.linkGoogleAccount();
          set({ isLoading: false });
          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to link Google account';
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      unlinkGoogleAccount: async () => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.unlinkGoogleAccount();
          set({ isLoading: false });
          return response;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to unlink Google account';
          set({
            isLoading: false,
            error: errorMessage,
          });

          return {
            success: false,
            error: errorMessage,
          };
        }
      },

      isGoogleLinked: async () => {
        try {
          return await authService.isGoogleLinked();
        } catch (error) {
          console.error('Failed to check Google link status:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
