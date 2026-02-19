import { supabase } from "../supabase";
import { AuthUser } from "../../types/user";
import { GoogleSignInResult } from "./types";
import { GoogleSignin, statusCodes } from "./config";

export async function signInWithGoogleNative(): Promise<GoogleSignInResult> {
  if (!GoogleSignin) {
    return {
      success: false,
      error:
        "Google Sign-in is not available in Expo Go. Please use email authentication or build a development build.",
    };
  }

  try {
    await GoogleSignin.hasPlayServices();

    const userInfo: any = await GoogleSignin.signIn();
    console.log("✅ Google Sign-In successful");
    console.log(
      "🔍 Google userInfo structure:",
      JSON.stringify(userInfo, null, 2),
    );

    const tokens = await GoogleSignin.getTokens();

    if (!tokens.idToken) {
      throw new Error("No ID token received from Google");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: tokens.idToken,
    });

    if (error) {
      console.error("❌ Supabase Google Sign-In error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: "No user data received from authentication",
      };
    }

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email!,
      isEmailVerified: true,
      lastLoginAt: new Date().toISOString(),
    };

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();

    const isNewUser = !profile;

    if (isNewUser) {
      console.log("🔍 Creating profile for new Google user...");
      console.log("🔍 Available user data:", {
        userId: data.user.id,
        email: data.user.email,
        userInfo: userInfo,
      });

      const userName =
        userInfo?.data?.user?.name ||
        userInfo?.user?.name ||
        userInfo?.user?.givenName ||
        userInfo?.displayName ||
        userInfo?.name ||
        "Google User";

      console.log("🔍 Extracted user name:", userName);

      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email: data.user.email!,
        name: userName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (profileError) {
        console.warn(
          "⚠️ Failed to create profile for Google user:",
          profileError,
        );
        console.warn(
          "⚠️ Profile error details:",
          JSON.stringify(profileError, null, 2),
        );
      } else {
        console.log("✅ Successfully created profile for Google user");
      }
    } else {
      console.log("✅ Returning Google user - profile exists");
    }

    console.log("✅ Google Sign-In completed successfully");
    return {
      success: true,
      user: authUser,
      isNewUser,
    };
  } catch (error: any) {
    console.error("❌ Native Google Sign-In error:", error);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return {
        success: false,
        error: "Sign-in was cancelled",
      };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return {
        success: false,
        error: "Sign-in is already in progress",
      };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        error: "Google Play services not available",
      };
    }

    return {
      success: false,
      error: error.message || "Google Sign-In failed",
    };
  }
}

export async function signOutGoogleNative(): Promise<void> {
  try {
    if (GoogleSignin) {
      await GoogleSignin.signOut();
    }
    console.log("✅ Google Sign-Out successful");
  } catch (error) {
    console.error("❌ Google Sign-Out failed:", error);
  }
}
