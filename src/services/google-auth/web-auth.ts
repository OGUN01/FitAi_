import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { supabase } from "../supabase";
import { makeRedirectUri } from "expo-auth-session";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthUser } from "../../types/user";
import { GoogleSignInResult } from "./types";

const OAUTH_STATE_KEY = "google_oauth_state";

export async function signInWithGoogleWeb(): Promise<GoogleSignInResult> {
  try {
    // BUG 5 FIX: Use cryptographically secure random UUID instead of Math.random()
    const state = Crypto.randomUUID();

    // BUG 4 FIX: Store the state in AsyncStorage for CSRF verification in the callback
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
        error: error.message,
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

    // BUG 4 FIX: Verify the state parameter matches what we stored before redirect
    const storedState = await AsyncStorage.getItem(OAUTH_STATE_KEY);
    await AsyncStorage.removeItem(OAUTH_STATE_KEY); // Clean up regardless

    if (!callbackState || callbackState !== storedState) {
      console.error("\u274c OAuth state mismatch - possible CSRF attack");
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
        error: error.message,
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    const isNewUser = !profile;

    if (isNewUser) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || user.user_metadata?.name || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
      }
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
