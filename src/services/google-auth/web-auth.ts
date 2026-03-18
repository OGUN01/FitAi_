import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { supabase } from "../supabase";
import { makeRedirectUri } from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthUser } from "../../types/user";
import { GoogleSignInResult } from "./types";

const OAUTH_STATE_KEY = "google_oauth_state";

/**
 * Maps Supabase/Google auth errors to user-friendly messages
 */
function mapAuthError(error: any): string {
  const msg: string = error?.message || error?.code || "";

  if (
    msg.includes("identity_already_exists") ||
    msg.includes("Identity is already linked") ||
    msg.includes("already linked")
  ) {
    return "This Google account is already linked to a different account. Please sign out and use the correct account.";
  }

  if (
    msg.includes("email_exists") ||
    msg.includes("User already registered") ||
    msg.includes("already registered")
  ) {
    return "An account with this email already exists. If you previously signed up with email and password, please sign in with email instead. You can then link your Google account from Profile settings.";
  }

  if (
    msg.includes("account_exists_with_different_credential") ||
    msg.includes("different_credential")
  ) {
    return "This email is already registered with a different sign-in method. Please use email and password to sign in, then link Google from your Profile settings.";
  }

  return error?.message || "Google Sign-In failed. Please try again.";
}

export async function signInWithGoogleWeb(): Promise<GoogleSignInResult> {
  try {
    // Use cryptographically secure random UUID for CSRF protection
    const state = Crypto.randomUUID();

    // Store state in AsyncStorage for CSRF verification in the callback
    await AsyncStorage.setItem(OAUTH_STATE_KEY, state);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          Platform.OS === "web" &&
          typeof window !== "undefined" &&
          window.location
            ? `${window.location.origin}/auth/callback`
            : makeRedirectUri({ path: "auth/callback" }),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          state,
        },
      },
    });

    if (error) {
      console.error("❌ Web Google Sign-In error:", error);
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ Web Google Sign-In failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Google Sign-In failed",
    };
  }
}

export async function handleGoogleCallback(
  url: string,
): Promise<GoogleSignInResult> {
  try {
    const parsedUrl = new URL(url);
    const code = parsedUrl.searchParams.get("code") || "";
    const callbackState = parsedUrl.searchParams.get("state");

    // Verify the state parameter to prevent CSRF attacks
    const storedState = await AsyncStorage.getItem(OAUTH_STATE_KEY);
    await AsyncStorage.removeItem(OAUTH_STATE_KEY); // Clean up regardless

    if (!callbackState || callbackState !== storedState) {
      console.error("❌ OAuth state mismatch - possible CSRF attack");
      return {
        success: false,
        error: "OAuth state verification failed. Please try signing in again.",
      };
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("❌ OAuth callback error:", error);
      return {
        success: false,
        error: mapAuthError(error),
      };
    }

    if (!data.session?.user) {
      return {
        success: false,
        error: "No user data received from Google",
      };
    }

    const user = data.session.user;
    const authUser: AuthUser = {
      id: user.id,
      email: user.email!,
      isEmailVerified: true,
      lastLoginAt: new Date().toISOString(),
    };

    // Check if profile already exists for this user
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    const isNewUser = !existingProfile;

    if (isNewUser) {
      // Use upsert to handle the case where Link Identities causes Supabase to
      // reuse an existing email/password user's ID for the Google identity.
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email!,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            "Google User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id", ignoreDuplicates: true },
      );

      if (profileError) {
        console.warn(
          "⚠️ Failed to upsert profile for Google user:",
          profileError.message,
        );
      }
    } else {
      // Update last activity for existing user
      await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }

    return {
      success: true,
      user: authUser,
      isNewUser,
    };
  } catch (error) {
    console.error("❌ Google callback handling failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "OAuth callback failed",
    };
  }
}
