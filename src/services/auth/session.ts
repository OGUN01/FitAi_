import { supabase } from "../supabase";
import { AuthUser } from "../../types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthResponse, AuthSession } from "./types";

/**
 * Get current session
 */
export function getCurrentSession(
  currentSession: AuthSession | null,
): AuthSession | null {
  return currentSession;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(currentSession: AuthSession | null): boolean {
  return currentSession !== null;
}

/**
 * Get current user
 */
export function getCurrentUser(
  currentSession: AuthSession | null,
): AuthUser | null {
  return currentSession?.user || null;
}

/**
 * Restore session from AsyncStorage
 */
export async function restoreSession(
  setSession: (session: AuthSession | null) => void,
): Promise<AuthResponse> {
  try {
    const sessionData = await AsyncStorage.getItem("auth_session");
    if (sessionData) {
      const session: AuthSession = JSON.parse(sessionData);

      // Check if session is still valid (handle both seconds and milliseconds)
      const currentTime = Date.now() / 1000; // Current time in seconds
      const expiresAt =
        session.expiresAt > 9999999999
          ? session.expiresAt / 1000
          : session.expiresAt; // Convert to seconds if in milliseconds

      if (expiresAt > currentTime) {
        setSession(session);
        return {
          success: true,
          user: session.user,
        };
      } else {
        // Session expired, clear it
        await AsyncStorage.removeItem("auth_session");
      }
    }

    // Try to get session from Supabase
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      // Try to refresh the session if we have a refresh token
      if (sessionData) {
        try {
          const storedSession: AuthSession = JSON.parse(sessionData);

          const { data: refreshData, error: refreshError } =
            await supabase.auth.refreshSession({
              refresh_token: storedSession.refreshToken,
            });

          if (refreshData.session && !refreshError) {
            const authUser: AuthUser = {
              id: refreshData.session.user.id,
              email: refreshData.session.user.email!,
              isEmailVerified:
                refreshData.session.user.email_confirmed_at !== null,
              lastLoginAt: new Date().toISOString(),
            };

            const newSession: AuthSession = {
              user: authUser,
              accessToken: refreshData.session.access_token,
              refreshToken: refreshData.session.refresh_token,
              expiresAt: refreshData.session.expires_at || 0,
            };

            setSession(newSession);
            await AsyncStorage.setItem(
              "auth_session",
              JSON.stringify(newSession),
            );

            return {
              success: true,
              user: authUser,
            };
          }
        } catch (refreshError) {
          console.error('[Session] restoreSession refresh failed:', refreshError);
        }
      }

      return {
        success: false,
        error: error.message,
      };
    }

    if (session && session.user) {
      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        isEmailVerified: session.user.email_confirmed_at !== null,
        lastLoginAt: new Date().toISOString(),
      };

      const newSession: AuthSession = {
        user: authUser,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || 0,
      };

      setSession(newSession);
      await AsyncStorage.setItem("auth_session", JSON.stringify(newSession));

      return {
        success: true,
        user: authUser,
      };
    }

    return {
      success: false,
      error: "No valid session found",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Session restoration failed",
    };
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void,
  setSession: (session: AuthSession | null) => void,
) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        isEmailVerified: session.user.email_confirmed_at !== null,
        lastLoginAt: new Date().toISOString(),
      };

      const newSession: AuthSession = {
        user: authUser,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || 0,
      };

      setSession(newSession);
      await AsyncStorage.setItem("auth_session", JSON.stringify(newSession));
      callback(authUser);
    } else if (event === "TOKEN_REFRESHED" && session?.user) {
      const authUser: AuthUser = {
        id: session.user.id,
        email: session.user.email!,
        isEmailVerified: session.user.email_confirmed_at !== null,
        lastLoginAt: new Date().toISOString(),
      };

      const newSession: AuthSession = {
        user: authUser,
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || 0,
      };

      setSession(newSession);
      await AsyncStorage.setItem("auth_session", JSON.stringify(newSession));
      callback(authUser);
    // @ts-ignore - USER_DELETED is a valid Supabase auth event but not in the SDK type definitions
    } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
      setSession(null);
      await AsyncStorage.removeItem("auth_session");
      callback(null);
    }
  });
}
