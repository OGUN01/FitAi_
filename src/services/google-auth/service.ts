import { Platform } from "react-native";
import { GoogleSignInResult } from "./types";
import { configureGoogleSignIn } from "./config";
import { signInWithGoogleNative, signOutGoogleNative } from "./native-auth";
import { signInWithGoogleWeb, handleGoogleCallback } from "./web-auth";
import {
  linkGoogleAccount,
  unlinkGoogleAccount,
  isGoogleLinked,
  getGoogleUserInfo,
} from "./account-linking";

class GoogleAuthService {
  private static instance: GoogleAuthService;
  private isConfigured = false;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async configure(): Promise<void> {
    if (this.isConfigured) return;

    const success = await configureGoogleSignIn();
    this.isConfigured = success;
  }

  async signInWithGoogle(): Promise<GoogleSignInResult> {
    try {
      console.log("🔐 Starting Google Sign-In process...");

      await this.configure();

      if (Platform.OS === "web") {
        return await signInWithGoogleWeb();
      } else {
        return await signInWithGoogleNative();
      }
    } catch (error) {
      console.error("❌ Google Sign-In failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Google Sign-In failed",
      };
    }
  }

  async handleGoogleCallback(url: string): Promise<GoogleSignInResult> {
    return handleGoogleCallback(url);
  }

  async signOut(): Promise<void> {
    try {
      if (Platform.OS !== "web") {
        await signOutGoogleNative();
      }
      console.log("✅ Google Sign-Out successful");
    } catch (error) {
      console.error("❌ Google Sign-Out failed:", error);
    }
  }

  async linkGoogleAccount(): Promise<GoogleSignInResult> {
    return linkGoogleAccount();
  }

  async unlinkGoogleAccount(): Promise<GoogleSignInResult> {
    return unlinkGoogleAccount();
  }

  async isGoogleLinked(): Promise<boolean> {
    return isGoogleLinked();
  }

  async getGoogleUserInfo(): Promise<any> {
    return getGoogleUserInfo();
  }
}

export const googleAuthService = GoogleAuthService.getInstance();
export default googleAuthService;
