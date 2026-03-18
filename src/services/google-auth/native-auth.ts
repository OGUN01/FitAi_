import { supabase } from "../supabase";
import { AuthUser } from "../../types/user";
import { GoogleSignInResult } from "./types";
import { GoogleSignin, statusCodes } from "./config";

/**
 * Maps Supabase/Google auth errors to user-friendly messages
 */
function mapAuthError(error: any): string {
  const msg: string = error?.message || error?.code || "";

  // Identity already linked to a different account
  if (
    msg.includes("identity_already_exists") ||
    msg.includes("Identity is already linked") ||
    msg.includes("already linked")
  ) {
    return "This Google account is already linked to a different account. Please sign out and use the correct account.";
  }

  // Email already exists with a different sign-in method
  if (
    msg.includes("email_exists") ||
    msg.includes("User already registered") ||
    msg.includes("already registered") ||
    msg.includes("already been registered")
  ) {
    return "An account with this email already exists. If you previously signed up with email and password, please sign in with email instead. You can then link your Google account from Profile settings.";
  }

  // Account conflict — email registered with different provider
  if (
    msg.includes("account_exists_with_different_credential") ||
    msg.includes("different_credential")
  ) {
    return "This email is already registered with a different sign-in method. Please use email and password to sign in, then link Google from your Profile settings.";
  }

  return error?.message || "Google Sign-In failed. Please try again.";
}

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
        error: mapAuthError(error),
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

    // Check if profile already exists for this user ID
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .single();

    const isNewUser = !existingProfile;

    if (isNewUser) {
      // Extract name from Google userInfo — multiple possible structures
      const userName =
        userInfo?.data?.user?.name ||
        userInfo?.user?.name ||
        userInfo?.user?.givenName ||
        userInfo?.displayName ||
        userInfo?.name ||
        data.user.user_metadata?.full_name ||
        data.user.user_metadata?.name ||
        "Google User";

      // Use upsert instead of insert to handle the case where "Link Identities" is ON
      // and Supabase reuses an existing email/password user's ID for the Google identity.
      // onConflict:'id' + ignoreDuplicates:true means: create if not exists, skip if exists.
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email!,
          name: userName,
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
      // Update last login timestamp for existing user
      await supabase
        .from("profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", data.user.id);
    }

    return {
      success: true,
      user: authUser,
      isNewUser,
    };
  } catch (error: any) {
    console.error("❌ Native Google Sign-In error:", error);

    if (error.code === statusCodes?.SIGN_IN_CANCELLED) {
      return {
        success: false,
        error: "Sign-in was cancelled",
      };
    } else if (error.code === statusCodes?.IN_PROGRESS) {
      return {
        success: false,
        error: "Sign-in is already in progress",
      };
    } else if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        success: false,
        error: "Google Play services not available on this device",
      };
    }

    return {
      success: false,
      error: mapAuthError(error),
    };
  }
}

export async function signOutGoogleNative(): Promise<void> {
  try {
    if (GoogleSignin) {
      await GoogleSignin.signOut();
    }
  } catch (error) {
    console.error("❌ Google Sign-Out failed:", error);
  }
}
