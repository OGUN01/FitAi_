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
}

export { GoogleSignin, statusCodes };

export const getEnvVar: EnvVarGetter = (key: string): string | null => {
  try {
    const processEnvValue = process.env[key];
    if (processEnvValue) {
      return processEnvValue;
    }

    const expoConfigValue = (Constants.expoConfig as any)?.[key];
    if (expoConfigValue) {
      return expoConfigValue;
    }

    const extraValue = (Constants.expoConfig as any)?.extra?.[key];
    if (extraValue) {
      return extraValue;
    }

    const manifestValue = (Constants.manifest as any)?.extra?.[key];
    if (manifestValue) {
      return manifestValue;
    }

    return null;
  } catch (error) {
    console.error(`Error accessing ${key}:`, error);
    return null;
  }
};

export async function configureGoogleSignIn(): Promise<boolean> {
  if (!GoogleSignin) {
    return true;
  }

  try {
    if (Platform.OS !== "web") {

      const webClientId = getEnvVar("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID") || "";
      const iosClientId = getEnvVar("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID") || "";

      if (!webClientId) {
        console.error(
          "❌ CRITICAL: Web Client ID not found! Google Sign-In will fail.",
        );
      }


      await GoogleSignin.configure({
        webClientId,
        iosClientId,
        offlineAccess: true,
        hostedDomain: "",
        forceCodeForRefreshToken: true,
      });
    }
    return true;
  } catch (error) {
    console.error("❌ Google Sign-In configuration failed:", error);
    return false;
  }
}
