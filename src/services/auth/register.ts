import { supabase } from "../supabase";
import { AuthUser, RegisterCredentials } from "../../types/user";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthResponse, AuthSession } from "./types";

/**
 * Register a new user with email and password
 */
export async function register(
  credentials: RegisterCredentials,
  setSession: (session: AuthSession | null) => void,
): Promise<AuthResponse> {
  try {
    const { email, password, confirmPassword } = credentials;
    console.log("🔐 Auth Service: Attempting register for:", email);
    console.log("🔐 Auth Service: Password length:", password.length);

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
        // Enable email confirmation for production security
        emailRedirectTo: undefined, // React Native doesn't need redirect URL
        data: {
          // Add user metadata for better tracking
          signup_source: "fitai_app",
          signup_timestamp: new Date().toISOString(),
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    if (data.user) {
      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email!,
        isEmailVerified: data.user.email_confirmed_at !== null,
        lastLoginAt: new Date().toISOString(),
      };

      // Only save session if email is verified OR if no session exists (email confirmation required)
      // For unverified users, we don't want to auto-authenticate them
      if (data.session && data.user.email_confirmed_at) {
        const session: AuthSession = {
          user: authUser,
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresAt: data.session.expires_at || 0,
        };

        setSession(session);
        await AsyncStorage.setItem("auth_session", JSON.stringify(session));
      } else {
        // Don't save session for unverified users - they need to verify email first
        console.log(
          "🔐 Auth Service: User registered but email not verified, not saving session",
        );
      }

      return {
        success: true,
        user: authUser,
      };
    }

    return {
      success: false,
      error: "Registration failed",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
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
