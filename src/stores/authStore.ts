import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthUser, LoginCredentials, RegisterCredentials } from "../types/user";
import { authService, AuthResponse } from "../services/auth";
import { generateGuestId, migrateGuestId } from "../utils/uuid";
import { authEvents } from "../services/authEvents";

const SESSION_RESTORE_TIMEOUT_MS = 10000;

interface AuthState {
  // State
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuestMode: boolean;
  guestId: string | null;
  error: string | null;
  isInitialized: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
  logout: () => Promise<AuthResponse>;
  resetPassword: (email: string) => Promise<AuthResponse>;
  resendEmailVerification: (email: string) => Promise<AuthResponse>;
  checkEmailVerification: (
    email: string,
  ) => Promise<{ isVerified: boolean; error?: string }>;
  signInWithGoogle: () => Promise<any>;
  linkGoogleAccount: () => Promise<any>;
  unlinkGoogleAccount: () => Promise<any>;
  isGoogleLinked: () => Promise<boolean>;
  setGuestMode: (enabled: boolean) => void;
  exitGuestMode: () => void;
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
      isGuestMode: false,
      guestId: null,
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
              isGuestMode: false,
              guestId: null,
              isLoading: false,
              error: null,
            });
            authEvents.emit("SIGNED_IN", {
              userId: response.user.id,
              email: response.user.email,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: response.error || "Login failed",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Login failed";
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

      register: async (
        credentials: RegisterCredentials,
      ): Promise<AuthResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.register(credentials);

          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: response.user.isEmailVerified,
              isGuestMode: false,
              guestId: null,
              isLoading: false,
              error: null,
            });
            if (response.user.isEmailVerified) {
              authEvents.emit("SIGNED_IN", {
                userId: response.user.id,
                email: response.user.email,
              });
            }
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: response.error || "Registration failed",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Registration failed";
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

        let response: AuthResponse = {
          success: true,
        };

        try {
          response = await authService.logout();
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Logout failed";
          response = {
            success: false,
            error: errorMessage,
          };
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isGuestMode: false,
            guestId: null,
            isLoading: false,
            error: null,
          });
          authEvents.emit("SIGNED_OUT");

          // Clear all user data (fitness, nutrition, onboarding, offline queues, etc.) to prevent data leaks
          // Use dynamic import to avoid circular dependency issues
          try {
            const { clearAllUserData } = await import('../utils/clearUserData');
            await clearAllUserData();
          } catch (clearError) {
            console.error("[authStore] Failed to clear user data during logout:", clearError);
          }
        }

        return response.success ? response : { success: true };
      },

      resetPassword: async (email: string): Promise<AuthResponse> => {
        set({ isLoading: true, error: null });

        try {
          const response = await authService.resetPassword(email);

          set({
            isLoading: false,
            error: response.success
              ? null
              : response.error || "Password reset failed",
          });

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Password reset failed";
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
            error: response.success
              ? null
              : response.error || "Email verification failed",
          });

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Email verification failed";
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

      checkEmailVerification: async (email: string) => {
        try {
          return await authService.checkEmailVerification(email);
        } catch (error) {
          return {
            isVerified: false,
            error:
              error instanceof Error
                ? error.message
                : "Verification check failed",
          };
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: AuthUser | null) => {
        set({
          user,
          isAuthenticated: user !== null && user.isEmailVerified,
          // Clear guest mode when a real user signs in
          ...(user !== null && user.isEmailVerified ? { isGuestMode: false, guestId: null } : {}),
        });
      },

      initialize: async () => {
        if (get().isInitialized) {
          return;
        }

        set({ isLoading: true });

        try {
          // Add timeout wrapper to prevent hanging (10 seconds max for web cold starts)
          const restorePromise = authService.restoreSession();
          const timeoutPromise = new Promise<AuthResponse>((resolve) =>
            setTimeout(() => {
              resolve({ success: false, error: "Session restore timeout" });
            }, SESSION_RESTORE_TIMEOUT_MS),
          );

          const response = await Promise.race([restorePromise, timeoutPromise]);

          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: response.user.isEmailVerified,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              isInitialized: true,
              error: null,
            });
          }

          // Set up auth state change listener
          authService.onAuthStateChange((user) => {
            get().setUser(user);
          });

          if (response.success && response.user && response.source === "cache") {
            void authService.revalidateSession().then((revalidated) => {
              if (revalidated.success && revalidated.user) {
                get().setUser(revalidated.user);
                return;
              }

              get().setUser(null);
            });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            isInitialized: true,
            error:
              error instanceof Error ? error.message : "Initialization failed",
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
              isGuestMode: false,
              guestId: null,
              isLoading: false,
              error: null,
            });
            authEvents.emit("SIGNED_IN", {
              userId: response.user.id,
              email: response.user.email,
            });
          } else {
            set({
              isLoading: false,
              error: response.error || "Google Sign-In failed",
            });
          }

          return response;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Google Sign-In failed";
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
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to link Google account";
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
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to unlink Google account";
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
          console.error("Failed to check Google link status:", error);
          return false;
        }
      },

      setGuestMode: (enabled: boolean) => {
        set((state) => {
          let guestId: string | null = null;

          if (enabled) {
            if (state.guestId) {
              guestId = migrateGuestId(state.guestId);
            } else {
              guestId = generateGuestId();
            }
          }

          return {
            isGuestMode: enabled,
            guestId,
            isAuthenticated: false,
          };
        });
      },

      exitGuestMode: () => {
        set({
          isGuestMode: false,
          guestId: null,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          try {
            const value = await AsyncStorage.getItem(name);
            return value;
          } catch (e) {
            await AsyncStorage.removeItem(name);
            return null;
          }
        },
        setItem: async (name: string, value: string) => {
          try {
            await AsyncStorage.setItem(name, value);
          } catch (e) {
            console.error('[AuthStore] Failed to persist auth state:', e);
          }
        },
        removeItem: async (name: string) => {
          try {
            await AsyncStorage.removeItem(name);
          } catch (e) {
            console.error('[AuthStore] Failed to clear auth state:', e);
          }
        },
      })),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isGuestMode: state.isGuestMode,
        guestId: state.guestId,
      }),
    },
  ),
);

export default useAuthStore;
