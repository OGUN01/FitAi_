import GoogleFit, { Scopes } from "react-native-google-fit";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export class GoogleFitAuth {
  private isInitialized = false;
  private permissionsGranted = false;

  private readonly scopes = [
    Scopes.FITNESS_ACTIVITY_READ,
    Scopes.FITNESS_ACTIVITY_WRITE,
    Scopes.FITNESS_BODY_READ,
    Scopes.FITNESS_BODY_WRITE,
    Scopes.FITNESS_HEART_RATE_READ,
    Scopes.FITNESS_LOCATION_READ,
    Scopes.FITNESS_NUTRITION_READ,
    Scopes.FITNESS_NUTRITION_WRITE,
    Scopes.FITNESS_SLEEP_READ,
  ];

  async initialize(): Promise<boolean> {
    try {
      console.log("🤖 Initializing Google Fit integration...");

      if (Platform.OS !== "android") {
        console.log("📱 Google Fit only available on Android devices");
        return false;
      }

      const isAvailable = await GoogleFit.checkIsAuthorized();
      console.log(`📊 Google Fit availability check: ${isAvailable}`);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error("❌ Google Fit initialization failed:", error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        const initSuccess = await this.initialize();
        if (!initSuccess) return false;
      }

      console.log("🔐 Requesting Google Fit permissions...");

      const authResult = await GoogleFit.authorize({
        scopes: this.scopes,
      });

      this.permissionsGranted = authResult.success;

      if (authResult.success) {
        console.log("✅ Google Fit permissions granted");
        await AsyncStorage.setItem("fitai_googlefit_permissions", "granted");
        await this.startObservers();
      } else {
        console.warn("❌ Google Fit permissions denied:", authResult.message);
        await AsyncStorage.setItem("fitai_googlefit_permissions", "denied");
      }

      return authResult.success;
    } catch (error) {
      console.error("❌ Failed to request Google Fit permissions:", error);
      return false;
    }
  }

  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS !== "android") return false;

      const isAuthorized = await GoogleFit.checkIsAuthorized();
      const storedPermissions = await AsyncStorage.getItem(
        "fitai_googlefit_permissions",
      );

      // @ts-ignore - Type issue with isAuthorized void check
      return !!(isAuthorized && storedPermissions === "granted");
    } catch (error) {
      console.error("❌ Error checking Google Fit permissions:", error);
      return false;
    }
  }

  private async startObservers(): Promise<void> {
    try {
      console.log("👀 Starting Google Fit data observers...");

      await GoogleFit.startRecording(
        (callback: any) => {
          console.log("📊 Google Fit data update received:", callback);
        },
        ["step", "distance", "activity"],
      );

      console.log("✅ Google Fit observers started");
    } catch (error) {
      console.error("❌ Failed to start Google Fit observers:", error);
    }
  }

  async disconnect(): Promise<boolean> {
    try {
      console.log("🔌 Disconnecting from Google Fit...");

      await GoogleFit.disconnect();
      await AsyncStorage.setItem("fitai_googlefit_permissions", "denied");

      this.permissionsGranted = false;

      console.log("✅ Successfully disconnected from Google Fit");
      return true;
    } catch (error) {
      console.error("❌ Failed to disconnect from Google Fit:", error);
      return false;
    }
  }

  getPermissionsStatus(): boolean {
    return this.permissionsGranted;
  }
}
