import { supabase } from './supabase';
import { AuthUser, LoginCredentials, RegisterCredentials } from '../types/user';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleAuthService, GoogleSignInResult } from './googleAuth';
import { migrationManager } from './migrationManager';
import { dataBridge } from './DataBridge';
import { isNetworkError } from '../utils/networkErrorDetection';

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  error?: string;
  source?: "cache" | "server";
  /**
   * Set to `true` when session revalidation failed due to a transient
   * network/transport error (not a genuine auth rejection).
   *
   * Callers MUST treat this differently from a normal `success: false`:
   *   - Do NOT sign the user out / clear user-facing state.
   *   - Keep the user in a degraded/offline state; the cached session may
   *     still be valid and will be revalidated on the next connectivity.
   *
   * Field is OPTIONAL and additive so existing callers that only check
   * `.success` and `.user` are unaffected.
   */
  isNetworkError?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * P1-7: AsyncStorage key for the cached AuthUser (display data only — NOT tokens).
 *
 * CANONICAL SESSION STORE: Supabase's SecureStore adapter (configured in
 * supabase.ts with persistSession: true) is the single source of truth for the
 * access token, refresh token, and token expiry. supabase.auth.getSession()
 * reads from SecureStore and refreshes as needed.
 *
 * This AsyncStorage cache holds ONLY the denormalized AuthUser (id/email) so the
 * UI can render the user's name immediately on cold start without awaiting a
 * network round-trip. It MUST NOT be treated as authoritative for session
 * validity — token validity is always revalidated via supabase.auth.getSession().
 * Storing tokens here in addition to SecureStore caused dual-persistence drift
 * (user appeared logged in from AsyncStorage but Supabase had no valid token → 401s).
 */
const AUTH_USER_CACHE_KEY = "auth_user_cache";

class AuthService {
  private static instance: AuthService;
  private currentSession: AuthSession | null = null;

  private constructor() {}

  private normalizeExpiresAt(expiresAt: number): number {
    return expiresAt > 9999999999 ? expiresAt / 1000 : expiresAt;
  }

  private buildAuthUser(
    user: {
      id: string;
      email?: string | null;
      email_confirmed_at?: string | null;
      created_at?: string;
    },
    fallbackLastLoginAt?: string,
  ): AuthUser {
    return {
      id: user.id,
      email: user.email || "",
      isEmailVerified: user.email_confirmed_at !== null,
      lastLoginAt: fallbackLastLoginAt || new Date().toISOString(),
      createdAt: user.created_at,
    };
  }

  private async persistSession(session: AuthSession): Promise<void> {
    this.currentSession = session;
    dataBridge.setUserId(session.user.id);
    // P1-7: Persist ONLY the AuthUser (display data) to AsyncStorage. Tokens
    // are persisted by Supabase's SecureStore adapter (the canonical session
    // store). Storing tokens here too caused dual-persistence drift.
    try {
      await AsyncStorage.setItem(
        AUTH_USER_CACHE_KEY,
        JSON.stringify(session.user),
      );
    } catch (error) {
      console.error("Failed to cache auth user for fast display:", error);
    }
  }

  private async getCachedUser(): Promise<AuthUser | null> {
    try {
      const userData = await AsyncStorage.getItem(AUTH_USER_CACHE_KEY);
      return userData ? (JSON.parse(userData) as AuthUser) : null;
    } catch (error) {
      console.error("Failed to read cached auth user:", error);
      return null;
    }
  }

  private async restoreCachedSession(): Promise<AuthResponse | null> {
    // P1-7: The AsyncStorage cache holds ONLY the AuthUser for fast display.
    // Token validity is NOT trusted from here — restoreSession() always
    // follows up with revalidateSession() (via supabase.auth.getSession()) to
    // confirm the canonical SecureStore-backed session is actually valid.
    const cachedUser = await this.getCachedUser();
    if (!cachedUser) {
      return null;
    }

    dataBridge.setUserId(cachedUser.id);

    // Set currentSession so getCurrentUser() reflects the cached user
    // immediately — without this, the UI gets the user from the return value
    // but getCurrentUser() returns undefined until revalidateSession() runs,
    // causing screens that read getCurrentUser() (rather than the restore
    // result) to flicker empty. Tokens are unknown here (cache holds only the
    // display AuthUser), so accessToken/refreshToken/expiresAt are left empty —
    // revalidateSession() fills them in from the SecureStore-backed session.
    this.currentSession = {
      user: cachedUser,
      accessToken: "",
      refreshToken: "",
      expiresAt: 0,
    };

    return {
      success: true,
      user: cachedUser,
      source: "cache",
    };
  }

  async revalidateSession(): Promise<AuthResponse> {
    // P1-7: Token validity comes ONLY from Supabase's SecureStore-backed
    // session (supabase.auth.getSession()). The AsyncStorage cache holds only
    // the display AuthUser, not tokens, so it cannot be used to judge validity.
    const cachedUser = this.currentSession?.user ?? (await this.getCachedUser());

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session && session.user) {
        // If we had a cached user for a different id, the SecureStore session
        // is authoritative — adopt it.
        const authUser = this.buildAuthUser(
          session.user,
          cachedUser?.lastLoginAt,
        );

        await this.persistSession({
          user: authUser,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        });

        return {
          success: true,
          user: authUser,
          source: "server",
        };
      }

      // No active Supabase session. If we had a cached user, try a tokenless
      // refresh — Supabase SDK reads the refresh token from its own SecureStore
      // (we no longer store it in AsyncStorage, so we don't pass it here).
      if (cachedUser) {
        let refreshError: unknown = null;
        let refreshThrew = false;
        let refreshData: { session: any } = { session: null };

        try {
          const result = await supabase.auth.refreshSession();
          refreshData = result.data;
          refreshError = result.error;
        } catch (thrownError) {
          // refreshSession threw — almost always a transport fault (TypeError
          // "Failed to fetch", AbortError on timeout, or Supabase
          // AuthRetryableError). Classify before deciding whether to nuke
          // the local session. Previously this was silently swallowed and
          // the code fell through to clearLocalSession(), force-logging the
          // user out on every transient network blip.
          refreshThrew = true;
          refreshError = thrownError;
        }

        // Refresh succeeded with a fresh session — adopt it.
        if (refreshData.session && !refreshError) {
          const authUser = this.buildAuthUser(
            refreshData.session.user,
            cachedUser.lastLoginAt,
          );

          await this.persistSession({
            user: authUser,
            accessToken: refreshData.session.access_token,
            refreshToken: refreshData.session.refresh_token,
            expiresAt: refreshData.session.expires_at || 0,
          });

          return {
            success: true,
            user: authUser,
            source: "server",
          };
        }

        // Refresh failed. Distinguish network (transient — keep session)
        // from auth (session genuinely invalid — clear it).
        const networkFailure = isNetworkError(refreshError);
        const errorLabel = networkFailure ? "NETWORK" : "AUTH";
        console.error(
          `[AuthService] refreshSession failed [${errorLabel}]${
            refreshThrew ? " (thrown)" : " (returned error)"
          }:`,
          refreshError,
        );

        if (networkFailure) {
          // Transient transport fault. Keep the cached user/session so the
          // UI stays in a degraded/offline state rather than force-logout.
          // The next revalidateSession() call (on reconnect / app resume)
          // will retry against the same valid refresh token.
          return {
            success: false,
            error:
              refreshError instanceof Error
                ? refreshError.message
                : "Network error during session refresh",
            isNetworkError: true,
          };
        }

        // Genuine auth failure (invalid/expired refresh token, 401,
        // AuthSessionMissingError). Safe to clear and sign out.
        await this.clearLocalSession();
        return {
          success: false,
          error: "Stored session is no longer valid",
        };
      }

      // No cached user and no active Supabase session.
      // Do NOT call clearLocalSession here — there's nothing stale to remove
      // and calling it would wipe guest user data (onboarding_data, etc.).
      return {
        success: false,
        error: "No valid session found",
      };
    } catch (error) {
      // getSession() / persistSession() threw. Apply the same network-vs-auth
      // classification as the refresh path: a transient transport fault must
      // NOT clear the local session (would force-logout on a network blip).
      console.error("[AuthService] revalidateSession outer catch:", error);
      const networkFailure = isNetworkError(error);
      if (!networkFailure && this.currentSession) {
        await this.clearLocalSession();
      }
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Session restoration failed",
        isNetworkError: networkFailure,
      };
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
      // P1-7: Remove only the AuthUser display cache. The canonical token
      // session is cleared via supabase.auth.signOut() in logout().
      await AsyncStorage.removeItem(AUTH_USER_CACHE_KEY);
    } catch (error) {
      console.error('âŒ Failed to remove cached auth user:', error);
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
          createdAt: data.user.created_at,
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

          // P1-7: persistSession handles the cache write (AuthUser only).
          // Supabase SDK persists the token session to SecureStore via
          // persistSession: true in supabase.ts.
          await this.persistSession(session);
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
          error.code === 'email_not_confirmed' ||
          error.message?.includes('email') ||
          error.message?.includes('confirm') ||
          error.message?.includes('verify') ||
          error.message?.includes('not confirmed')
        ) {
          return {
            success: false,
            error:
              'Please verify your email address before logging in. Check your email for the verification link.',
          };
        }

        // Check for invalid login credentials
        if (
          error.code === 'invalid_credentials' ||
          error.code === 'invalid_grant' ||
          error.message?.includes('Invalid login credentials') ||
          error.message?.includes('invalid_credentials')
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

        // P1-7: persistSession sets the in-memory currentSession AND writes
        // only the AuthUser to AsyncStorage. Supabase SDK persists the token
        // session to SecureStore (persistSession: true in supabase.ts).
        await this.persistSession({
          user: authUser,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at || 0,
        });

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
   * Send password reset email.
   *
   * `redirectTo` points at the app's deep-link scheme so the recovery link
   * opens the app directly (not a browser). Supabase appends
   * `?type=recovery&code=...` (PKCE) or `#access_token=...` (implicit) to
   * this URL. `useAuthDeepLinks` + `deepLinkHandler` parse those params and
   * route the user to `PasswordResetScreen`. The path segment (`/auth/reset`)
   * is informational — the parser keys off the `type` query param.
   */
  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo:
          Platform.OS === 'web' && typeof window !== 'undefined' && window.location
            ? `${window.location.origin}/auth/reset`
            : "fitai://auth/reset",
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
   * Resend email verification.
   *
   * `emailRedirectTo` points at the app's deep-link scheme so the email
   * verification link opens the app directly. Supabase appends
   * `?type=signup&code=...` (PKCE) to this URL. `useAuthDeepLinks` +
   * `deepLinkHandler` parse the `type=signup` result and surface a success
   * state (the session is established via the SDK's onAuthStateChange).
   */
  async resendEmailVerification(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo:
            Platform.OS === 'web' && typeof window !== 'undefined' && window.location
              ? `${window.location.origin}/auth/verify`
              : 'fitai://auth/verify',
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
      const cachedSession = await this.restoreCachedSession();
      if (cachedSession) {
        return cachedSession;
      }

      return await this.revalidateSession();
    } catch (error) {
      // Only clear if there was a session to clean up
      if (this.currentSession) {
        await this.clearLocalSession();
      }
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
        const authUser = this.buildAuthUser(session.user);

        await this.persistSession({
          user: authUser,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        });
        callback(authUser);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Update stored session with refreshed token data
        const authUser = this.buildAuthUser(
          session.user,
          this.currentSession?.user?.lastLoginAt,
        );

        await this.persistSession({
          user: authUser,
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at || 0,
        });
        // Don't call callback — user state hasn't changed, only the token refreshed
      // @ts-ignore - USER_DELETED is a valid Supabase auth event but not in the SDK type definitions
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        // Only clear if we actually had a session — Supabase fires SIGNED_OUT on
        // startup even for users who were never signed in, which would wipe guest data.
        if (this.currentSession) {
          await this.clearLocalSession();
        }
        callback(null);
      }
    });
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<GoogleSignInResult> {
    const result = await googleAuthService.signInWithGoogle();

    // Trigger migration for Google sign-in too (same as email/password login)
    if (result.success && result.user) {
      dataBridge.setUserId(result.user.id);
      this.checkAndTriggerMigration(result.user.id).catch((error) => {
        console.error('❌ Migration check failed after Google sign-in:', error);
      });
    }

    return result;
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
