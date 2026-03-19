import { supabase } from './supabase';
import { AuthUser, LoginCredentials, RegisterCredentials } from '../types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleAuthService, GoogleSignInResult } from './googleAuth';
import { migrationManager } from './migrationManager';
import { dataBridge } from './DataBridge';

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;

  private constructor() {
    // Initialize Google Sign-In configuration
    this.initializeGoogleAuth();
  }

  /**
   * Initialize Google Authentication
   */
  private async initializeGoogleAuth(): Promise<void> {
    try {
      await googleAuthService.configure();
    } catch (error) {
      console.error('❌ Failed to initialize Google Auth:', error);
    }
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Clear the locally cached session state.
   */
  private async clearLocalSession(): Promise<void> {
    this.currentSession = null;
    dataBridge.setUserId(null);

    try {
      await AsyncStorage.removeItem('auth_session');
    } catch (error) {
      console.error('âŒ Failed to remove cached auth session:', error);
    }
  }

  /**
   * Register a new user with email and password
   */
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      const { email, password, confirmPassword } = credentials;

      // Validate passwords match
      if (password !== confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match',
        };
      }

      // Validate password strength
      if (password.length < 8) {
        return {
          success: false,
          error: 'Password must be at least 8 characters long',
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Enable email confirmation for production security
          emailRedirectTo: undefined, // React Native doesn't need redirect URL
          data: {
            // Add user metadata for better tracking
            signup_source: 'fitai_app',
            signup_timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          isEmailVerified: data.user.email_confirmed_at !== null,
          lastLoginAt: new Date().toISOString(),
        };

        // Only save session if email is verified OR if no session exists (email confirmation required)
        // For unverified users, we don't want to auto-authenticate them
        if (data.session && data.user.email_confirmed_at) {
          const session: AuthSession = {
            user: authUser,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at || 0,
          };

          this.currentSession = session;
          await AsyncStorage.setItem('auth_session', JSON.stringify(session));
          dataBridge.setUserId(authUser.id);
        } else {
          // Don't save session for unverified users - they need to verify email first
        }

        return {
          success: true,
          user: authUser,
        };
      }

      return {
        success: false,
        error: 'Registration failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Sign in with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { email, password } = credentials;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {

        // Check if error is related to email verification
        if (
          error.message.includes('email') ||
          error.message.includes('confirm') ||
          error.message.includes('verify') ||
          error.message.includes('not confirmed')
        ) {
          return {
            success: false,
            error:
              'Please verify your email address before logging in. Check your email for the verification link.',
          };
        }

        // Check for invalid login credentials
        if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_credentials')
        ) {
          return {
            success: false,
            error: 'Invalid email or password. Please check your credentials and try again.',
          };
        }

        return {
          success: false,
          error: error.message,
        };
      }

      // Check if user's email is confirmed
      if (data.user && !data.user.email_confirmed_at) {
        return {
          success: false,
          error:
            'Please verify your email address before logging in. Check your email for the verification link.',
        };
      }

      if (data.user && data.session) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email!,
          isEmailVerified: data.user.email_confirmed_at !== null,
          lastLoginAt: new Date().toISOString(),
        };

        // Store session
        this.currentSession = {
          user: authUser,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at || 0,
        };

        // Store session in AsyncStorage for persistence
        await AsyncStorage.setItem('auth_session', JSON.stringify(this.currentSession));

        // Set user ID in data bridge for potential migration
        dataBridge.setUserId(authUser.id);

        // Check if profile data migration is needed (don't await to avoid blocking login)
        this.checkAndTriggerMigration(authUser.id).catch((error) => {
          console.error('❌ Migration check failed:', error);
        });

        return {
          success: true,
          user: authUser,
        };
      }

      return {
        success: false,
        error: 'Login failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Sign out the current user
   */
  async logout(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.warn("âŒ Remote sign-out failed; clearing local auth state anyway:", error.message);
      }

      // Clear local session and auth-scoped caches regardless of remote outcome.
      await this.clearLocalSession();

      return {
        success: true,
      };
    } catch (error) {
      await this.clearLocalSession();
      return {
        success: true,
      };
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: undefined, // We'll handle password reset in-app
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Password reset failed',
      };
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: undefined, // Don't use redirect for React Native
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email verification failed',
      };
    }
  }

  /**
   * Check if user's email is verified
   */
  async checkEmailVerification(email: string): Promise<{ isVerified: boolean; error?: string }> {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        return { isVerified: false, error: error.message };
      }

      if (user && user.email === email) {
        return { isVerified: user.email_confirmed_at !== null };
      }

      return { isVerified: false, error: 'User not found' };
    } catch (error) {
      return {
        isVerified: false,
        error: error instanceof Error ? error.message : 'Verification check failed',
      };
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): AuthSession | null {
    return this.currentSession;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentSession?.user || null;
  }

  /**
   * Restore session from AsyncStorage
   */
  async restoreSession(): Promise<AuthResponse> {
    try {
      const sessionData = await AsyncStorage.getItem('auth_session');
      const storedSession: AuthSession | null = sessionData ? JSON.parse(sessionData) : null;

      if (storedSession) {
        const currentTime = Date.now() / 1000;
        const expiresAt =
          storedSession.expiresAt > 9999999999
            ? storedSession.expiresAt / 1000
            : storedSession.expiresAt;

        if (expiresAt <= currentTime) {
          await this.clearLocalSession();
          return {
            success: false,
            error: 'Session expired',
          };
        }
      }

      // Prefer a server-validated session over the cached blob.
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && session.user && (!storedSession || session.user.id === storedSession.user.id)) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          isEmailVerified: session.user.email_confirmed_at !== null,
          lastLoginAt: new Date().toISOString(),
        };

        this.currentSession = {
          user: authUser,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        };

        dataBridge.setUserId(authUser.id);
        await AsyncStorage.setItem('auth_session', JSON.stringify(this.currentSession));

        return {
          success: true,
          user: authUser,
        };
      }

      if (storedSession) {
        try {
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: storedSession.refreshToken,
          });

          if (refreshData.session && !refreshError) {
            const authUser: AuthUser = {
              id: refreshData.session.user.id,
              email: refreshData.session.user.email!,
              isEmailVerified: refreshData.session.user.email_confirmed_at !== null,
              lastLoginAt: storedSession.user.lastLoginAt || new Date().toISOString(),
            };

            this.currentSession = {
              user: authUser,
              accessToken: refreshData.session.access_token,
              refreshToken: refreshData.session.refresh_token,
              expiresAt: refreshData.session.expires_at || 0,
            };

            dataBridge.setUserId(authUser.id);
            await AsyncStorage.setItem('auth_session', JSON.stringify(this.currentSession));

            return {
              success: true,
              user: authUser,
            };
          }
        } catch (refreshError) {
          // Continue to hard failure below.
        }

        await this.clearLocalSession();
        return {
          success: false,
          error: 'Stored session is no longer valid',
        };
      }

      await this.clearLocalSession();
      return {
        success: false,
        error: 'No valid session found',
      };
    } catch (error) {
      await this.clearLocalSession();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Session restoration failed',
      };
    }
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          isEmailVerified: session.user.email_confirmed_at !== null,
          lastLoginAt: new Date().toISOString(),
        };

        this.currentSession = {
          user: authUser,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        };

        dataBridge.setUserId(authUser.id);
        await AsyncStorage.setItem('auth_session', JSON.stringify(this.currentSession));
        callback(authUser);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Update stored session with refreshed token data
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email!,
          isEmailVerified: session.user.email_confirmed_at !== null,
          lastLoginAt: this.currentSession?.user.lastLoginAt || new Date().toISOString(),
        };

        this.currentSession = {
          user: authUser,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        };

        dataBridge.setUserId(authUser.id);
        await AsyncStorage.setItem('auth_session', JSON.stringify(this.currentSession));
        // Don't call callback — user state hasn't changed, only the token refreshed
      } else if (event === 'SIGNED_OUT') {
        await this.clearLocalSession();
        callback(null);
      }
    });
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<GoogleSignInResult> {
    return await googleAuthService.signInWithGoogle();
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(url: string): Promise<GoogleSignInResult> {
    return await googleAuthService.handleGoogleCallback(url);
  }

  /**
   * Link Google account to existing user
   */
  async linkGoogleAccount(): Promise<GoogleSignInResult> {
    return await googleAuthService.linkGoogleAccount();
  }

  /**
   * Unlink Google account from user
   */
  async unlinkGoogleAccount(): Promise<GoogleSignInResult> {
    return await googleAuthService.unlinkGoogleAccount();
  }

  /**
   * Check if user has Google account linked
   */
  async isGoogleLinked(): Promise<boolean> {
    return await googleAuthService.isGoogleLinked();
  }

  /**
   * Get Google user info if linked
   */
  async getGoogleUserInfo(): Promise<any> {
    return await googleAuthService.getGoogleUserInfo();
  }

  /**
   * Check and AUTO-START profile data migration if needed.
   * Migration runs in background, doesn't block login.
   * User can access the app immediately - data syncs automatically.
   */
  private async checkAndTriggerMigration(userId: string): Promise<void> {
    try {

      // Check if there's guest data to migrate
      const hasGuestData = await dataBridge.hasGuestDataForMigration();

      if (!hasGuestData) {
        return;
      }

      // AUTO-START migration (don't await to avoid blocking login)
      migrationManager
        .startProfileMigration(userId)
        .then((result) => {
          if (result.success) {
            if (result.localSyncKeys && result.remoteSyncKeys) {
              const pending = result.localSyncKeys.filter(
                (k: string) => !result.remoteSyncKeys!.includes(k)
              );
              if (pending.length > 0) {
              }
            }
          } else {
            // Errors are queued for retry - no user action needed
          }
        })
        .catch((error) => {
          console.error('❌ [AUTO-MIGRATION] Failed:', error);
          // Data is still in local storage - will retry on next app open
        });
    } catch (error) {
      console.error('❌ [AUTO-MIGRATION] Error in migration check:', error);
    }
  }
}

export const authService = AuthService.getInstance();
export default authService;
