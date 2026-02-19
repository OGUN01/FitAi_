import { Platform } from "react-native";
import Constants from "expo-constants";
import { EnvVarGetter } from "./types";

let GoogleSignin: any = null;
let statusCodes: any = null;

try {
  const googleSigninModule = require("@react-native-google-signin/google-signin");
  GoogleSignin = googleSigninModule.GoogleSignin;
  statusCodes = googleSigninModule.statusCodes;
} catch (error) {
  console.warn("⚠️ Google Sign-in not available (running in Expo Go)");
}

export { GoogleSignin, statusCodes };

export const getEnvVar: EnvVarGetter = (key: string): string | null => {
  try {
    const processEnvValue = process.env[key];
    if (processEnvValue) {
      console.log(`✅ ${key} found via process.env`);
      return processEnvValue;
    }

    const expoConfigValue = (Constants.expoConfig as any)?.[key];
    if (expoConfigValue) {
      console.log(`✅ ${key} found via Constants.expoConfig`);
      return expoConfigValue;
    }

    const extraValue = (Constants.expoConfig as any)?.extra?.[key];
    if (extraValue) {
      console.log(`✅ ${key} found via Constants.expoConfig.extra`);
      return extraValue;
    }

    const manifestValue = (Constants.manifest as any)?.extra?.[key];
    if (manifestValue) {
      console.log(`✅ ${key} found via Constants.manifest.extra`);
      return manifestValue;
    }

    console.warn(`❌ ${key} not found in any location`);
    return null;
  } catch (error) {
    console.error(`Error accessing ${key}:`, error);
    return null;
  }
};

export async function configureGoogleSignIn(): Promise<boolean> {
  if (!GoogleSignin) {
    console.warn("⚠️ Google Sign-in not configured - module not available");
    return true;
  }

  try {
    if (Platform.OS !== "web") {
      console.log("🔍 Google Auth Configuration Starting...");

      const webClientId = getEnvVar("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID") || "";
      const iosClientId = getEnvVar("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID") || "";

      if (!webClientId) {
        console.error(
          "❌ CRITICAL: Web Client ID not found! Google Sign-In will fail.",
        );
      }

      console.log("🔍 Client IDs loaded:");
      console.log(
        "  - Web Client ID:",
        webClientId ? webClientId.substring(0, 20) + "..." : "NOT SET",
      );
      console.log(
        "  - iOS Client ID:",
        iosClientId ? iosClientId.substring(0, 20) + "..." : "NOT SET",
      );

      await GoogleSignin.configure({
        webClientId,
        iosClientId,
        offlineAccess: true,
        hostedDomain: "",
        forceCodeForRefreshToken: true,
      });
    }
    console.log("✅ Google Sign-In configured successfully");
    return true;
  } catch (error) {
    console.error("❌ Google Sign-In configuration failed:", error);
    return false;
  }
}
