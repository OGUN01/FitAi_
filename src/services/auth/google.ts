import { googleAuthService } from "../google-auth/service";
import { GoogleSignInResult } from "../google-auth/types";

/**
 * Initialize Google Authentication
 * Uses the newer google-auth service module (refactored from googleAuth.ts)
 */
export async function initializeGoogleAuth(): Promise<void> {
  try {
    await googleAuthService.configure();
  } catch (error) {
    console.error("❌ Failed to initialize Google Auth:", error);
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  return await googleAuthService.signInWithGoogle();
}

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleCallback(
  url: string,
): Promise<GoogleSignInResult> {
  return await googleAuthService.handleGoogleCallback(url);
}

/**
 * Link Google account to existing user
 */
export async function linkGoogleAccount(): Promise<GoogleSignInResult> {
  return await googleAuthService.linkGoogleAccount();
}

/**
 * Unlink Google account from user
 */
export async function unlinkGoogleAccount(): Promise<GoogleSignInResult> {
  return await googleAuthService.unlinkGoogleAccount();
}

/**
 * Check if user has Google account linked
 */
export async function isGoogleLinked(): Promise<boolean> {
  return await googleAuthService.isGoogleLinked();
}

/**
 * Get Google user info if linked
 */
export async function getGoogleUserInfo(): Promise<any> {
  return await googleAuthService.getGoogleUserInfo();
}
