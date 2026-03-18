import { supabase } from "../supabase";
import { AuthUser, RegisterCredentials } from "../../types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthResponse, AuthSession } from "./types";

/**
 * Maps registration errors to user-friendly messages
 */
function mapRegisterError(error: any): string {
  const msg: string = error?.message || "";

  // User already exists
  if (
    msg.includes("User already registered") ||
    msg.includes("already registered") ||
    msg.includes("email_exists") ||
    msg.includes("already been registered")
  ) {
    return "An account with this email already exists. If you previously signed up with Google, please use the \"Continue with Google\" button instead.";
  }

  // Weak password
  if (msg.includes("Password should be") || msg.includes("weak_password")) {
    return "Your password is too weak. Please use at least 8 characters including letters and numbers.";
  }

  // Invalid email
  if (msg.includes("invalid email") || msg.includes("Unable to validate")) {
    return "Please enter a valid email address.";
  }

  // Rate limiting
  if (msg.includes("too many") || msg.includes("rate limit")) {
    return "Too many sign-up attempts. Please wait a few minutes and try again.";
  }

  return msg || "Account creation failed. Please try again.";
}

/**
 * Register a new user with email and password
 */
export async function register(
  credentials: RegisterCredentials,
  setSession: (session: AuthSession | null) => void,
): Promise<AuthResponse> {
  try {
    const { email, password, confirmPassword } = credentials;

    // Validate passwords match
    if (password !== confirmPassword) {
      return {
        success: false,
        error: "Passwords do not match",
      };
    }

    // Validate password strength
    if (password.length < 8) {
      return {
        success: false,
        error: "Password must be at least 8 characters long",
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // React Native doesn't need a web redirect URL
        emailRedirectTo: undefined,
        data: {
          signup_source: "fitai_app",
          signup_timestamp: new Date().toISOString(),
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: mapRegisterError(error),
      };
    }

    // Supabase may return a user with identities=[] when the email is already registered
    // (this is a Supabase security behavior to prevent user enumeration).
    // We detect this by checking if the user has no identities.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        success: false,
        error:
          "An account with this email already exists. If you signed up with Google, please use the \"Continue with Google\" button instead.",
      };
    }

    if (data.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email!,
        isEmailVerified: data.user.email_confirmed_at !== null,
        lastLoginAt: new Date().toISOString(),
      };

      // Only save session if email is already verified (not typical for email sign-up)
      if (data.session && data.user.email_confirmed_at) {
        const session: AuthSession = {
          user: authUser,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at || 0,
        };

        setSession(session);
        await AsyncStorage.setItem("auth_session", JSON.stringify(session));
      }
      // For unverified users: don't auto-authenticate — they must verify email first

      return {
        success: true,
        user: authUser,
      };
    }

    return {
      success: false,
      error: "Account creation failed. Please try again.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Account creation failed",
    };
  }
}

/**
 * Resend email verification
 */
export async function resendEmailVerification(
  email: string,
): Promise<AuthResponse> {
  try {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: undefined, // Don't use redirect for React Native
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
      error:
        error instanceof Error ? error.message : "Email verification failed",
    };
  }
}

/**
 * Check if user's email is verified
 */
export async function checkEmailVerification(
  email: string,
): Promise<{ isVerified: boolean; error?: string }> {
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

    return { isVerified: false, error: "User not found" };
  } catch (error) {
    return {
      isVerified: false,
      error:
        error instanceof Error ? error.message : "Verification check failed",
    };
  }
}
