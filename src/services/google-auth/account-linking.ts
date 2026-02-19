import { supabase } from "../supabase";
import { GoogleSignInResult } from "./types";

export async function linkGoogleAccount(): Promise<GoogleSignInResult> {
  try {
    console.log("🔗 Linking Google account to existing user...");

    const { data, error } = await supabase.auth.linkIdentity({
      provider: "google",
    });

    if (error) {
      console.error("❌ Google account linking error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log("✅ Google account linked successfully");
    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ Google account linking failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Account linking failed",
    };
  }
}

export async function unlinkGoogleAccount(): Promise<GoogleSignInResult> {
  try {
    console.log("🔓 Unlinking Google account...");

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return {
        success: false,
        error: userErr?.message || "No authenticated user",
      };
    }
    const googleIdentity = user.identities?.find(
      (i) => i.provider === "google",
    );
    if (!googleIdentity) {
      return { success: false, error: "No Google identity linked" };
    }
    const { data, error } = await supabase.auth.unlinkIdentity(googleIdentity);

    if (error) {
      console.error("❌ Google account unlinking error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log("✅ Google account unlinked successfully");
    return {
      success: true,
    };
  } catch (error) {
    console.error("❌ Google account unlinking failed:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Account unlinking failed",
    };
  }
}

export async function isGoogleLinked(): Promise<boolean> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const googleIdentity = user.identities?.find(
      (identity) => identity.provider === "google",
    );

    return !!googleIdentity;
  } catch (error) {
    console.error("❌ Failed to check Google link status:", error);
    return false;
  }
}

export async function getGoogleUserInfo(): Promise<any> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const googleIdentity = user.identities?.find(
      (identity) => identity.provider === "google",
    );

    return googleIdentity?.identity_data || null;
  } catch (error) {
    console.error("❌ Failed to get Google user info:", error);
    return null;
  }
}
