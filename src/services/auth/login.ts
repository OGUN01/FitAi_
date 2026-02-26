import { supabase } from "../supabase";
import { AuthUser, LoginCredentials } from "../../types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthResponse, AuthSession } from "./types";
import { dataBridge } from "../DataBridge";
import { migrationManager } from "../migrationManager";

/**
 * Sign in with email and password
 */
export async function login(
  credentials: LoginCredentials,
  setSession: (session: AuthSession | null) => void,
): Promise<AuthResponse> {
  try {
    const { email, password } = credentials;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {

      // Check if error is related to email verification
      if (
        error.message.includes("email") ||
        error.message.includes("confirm") ||
        error.message.includes("verify") ||
        error.message.includes("not confirmed")
      ) {
        return {
          success: false,
          error:
            "Please verify your email address before logging in. Check your email for the verification link.",
        };
      }

      // Check for invalid login credentials
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_credentials")
      ) {
        return {
          success: false,
          error:
            "Invalid email or password. Please check your credentials and try again.",
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
          "Please verify your email address before logging in. Check your email for the verification link.",
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
      const session: AuthSession = {
        user: authUser,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0,
      };

      setSession(session);

      // Store session in AsyncStorage for persistence
      await AsyncStorage.setItem("auth_session", JSON.stringify(session));

      // Set user ID in data bridge for potential migration
      dataBridge.setUserId(authUser.id);

      // Check if profile data migration is needed (don't await to avoid blocking login)
      checkAndTriggerMigration(authUser.id).catch((error) => {
        console.error("❌ Migration check failed:", error);
      });

      return {
        success: true,
        user: authUser,
      };
    }

    return {
      success: false,
      error: "Login failed",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
}

/**
 * Sign out the current user
 */
export async function logout(
  setSession: (session: AuthSession | null) => void,
): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Clear local session
    setSession(null);
    await AsyncStorage.removeItem("auth_session");

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Logout failed",
    };
  }
}

/**
 * Check and AUTO-START profile data migration if needed.
 * Migration runs in background, doesn't block login.
 * User can access the app immediately - data syncs automatically.
 */
async function checkAndTriggerMigration(userId: string): Promise<void> {
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
              (k: string) => !result.remoteSyncKeys!.includes(k),
            );
            if (pending.length > 0) {
            }
          }
        } else {
          // Errors are queued for retry - no user action needed
        }
      })
      .catch((error) => {
        console.error("❌ [AUTO-MIGRATION] Failed:", error);
        // Data is still in local storage - will retry on next app open
      });
  } catch (error) {
    console.error("❌ [AUTO-MIGRATION] Error in migration check:", error);
  }
}
