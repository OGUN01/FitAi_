import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import { supabase } from "../supabase";
import { AuthUser } from "../../types/user";
import { GoogleSignInResult } from "./types";

export async function signInWithGoogleWeb(): Promise<GoogleSignInResult> {
  try {
    const state = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Math.random().toString(),
      { encoding: Crypto.CryptoEncoding.HEX },
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo:
          Platform.OS === "web" &&
          typeof window !== "undefined" &&
          window.location
            ? `${window.location.origin}/auth/callback`
            : "exp://localhost:8081/--/auth/callback",
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

    console.log("✅ Google OAuth flow initiated for web");
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
    console.log("🔄 Handling Google OAuth callback...");

    const code = new URL(url).searchParams.get("code") || "";
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
        console.warn(
          "⚠️ Failed to create profile for Google user:",
          profileError,
        );
      }
    }

    console.log("✅ Google Sign-In successful");
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
