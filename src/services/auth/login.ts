import { supabase } from "../supabase";
import { AuthUser, LoginCredentials } from "../../types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthResponse, AuthSession } from "./types";
import { dataBridge } from "../DataBridge";
import { migrationManager } from "../migrationManager";

const SYNC_QUEUE_KEY = "offline_sync_queue";

/**
 * Maps login errors to user-friendly messages
 */
function mapLoginError(error: any, email?: string): string {
  const msg: string = error?.message || "";

  // Email not confirmed
  if (
    msg.includes("email") && msg.includes("confirm") ||
    msg.includes("not confirmed") ||
    msg.includes("Email not confirmed")
  ) {
    return "Please verify your email address before signing in. Check your inbox for a verification link.";
  }

  // Invalid credentials — could be wrong password OR could be Google-only account (no password set)
  if (
    msg.includes("Invalid login credentials") ||
    msg.includes("invalid_credentials") ||
    msg.includes("Invalid email or password")
  ) {
    return "Invalid email or password. If you signed up with Google, please use the \"Continue with Google\" button instead.";
  }

  // Too many attempts
  if (msg.includes("too many") || msg.includes("rate limit")) {
    return "Too many login attempts. Please wait a few minutes and try again.";
  }

  // Account disabled
  if (msg.includes("banned") || msg.includes("blocked") || msg.includes("disabled")) {
    return "This account has been disabled. Please contact support.";
  }

  return msg || "Sign in failed. Please try again.";
}

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
      return {
        success: false,
        error: mapLoginError(error, email),
      };
    }

    // Check if user's email is confirmed
    if (data.user && !data.user.email_confirmed_at) {
      return {
        success: false,
        error:
          "Please verify your email address before signing in. Check your inbox for the verification link.",
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

      // Clear any stale offline sync queue from previous sessions
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY).catch(() => {});

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
      error: "Sign in failed. Please try again.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Sign in failed",
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
          }
        }
      })
      .catch((error) => {
        console.error("❌ [AUTO-MIGRATION] Failed:", error);
      });
  } catch (error) {
    console.error("❌ [AUTO-MIGRATION] Error in migration check:", error);
  }
}
