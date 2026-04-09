// Privacy Policy Handler for Health Connect Compliance
// Handles privacy policy intent from Health Connect app

import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";

export interface PrivacyPolicyHandlerService {
  handlePrivacyPolicyRequest: () => Promise<boolean>;
  openPrivacyPolicy: () => Promise<void>;
  validatePrivacyPolicyAccess: () => Promise<boolean>;
}

class PrivacyPolicyHandler implements PrivacyPolicyHandlerService {
  private readonly PRIVACY_POLICY_URL = "https://fitai.app/privacy";

  /**
   * Handle privacy policy intent from Health Connect
   * This is called when Health Connect requests privacy policy access
   */
  async handlePrivacyPolicyRequest(): Promise<boolean> {
    try {

      // Validate privacy policy URL is accessible
      const isAccessible = await this.validatePrivacyPolicyAccess();

      if (!isAccessible) {
        console.error("❌ PRIVACY: Privacy policy URL not accessible");
        crossPlatformAlert(
          "Privacy Policy Unavailable",
          "Unable to access privacy policy at this time. Please try again later.",
          [{ text: "OK" }],
        );
        return false;
      }

      // Open privacy policy
      await this.openPrivacyPolicy();
      return true;
    } catch (error) {
      console.error(
        "❌ PRIVACY: Failed to handle privacy policy request:",
        error,
      );
      crossPlatformAlert(
        "Privacy Policy Error",
        "Unable to open privacy policy. Please visit fitai.app/privacy directly.",
        [{ text: "OK" }],
      );
      return false;
    }
  }

  /**
   * Open privacy policy in browser or WebView
   */
  async openPrivacyPolicy(): Promise<void> {
    try {
      // Try to open with Expo WebBrowser first (better UX)
      try {
        await WebBrowser.openBrowserAsync(this.PRIVACY_POLICY_URL, {
          dismissButtonStyle: "done",
          controlsColor: "#000000",
          readerMode: false,
          showTitle: true,
          enableBarCollapsing: false,
        // Some options may not be in all WebBrowser versions
        } as Parameters<typeof WebBrowser.openBrowserAsync>[1]);
      } catch (webBrowserError) {
        // Fallback to system browser
        const canOpen = await Linking.canOpenURL(this.PRIVACY_POLICY_URL);
        if (canOpen) {
          await Linking.openURL(this.PRIVACY_POLICY_URL);
        } else {
          throw new Error("Cannot open privacy policy URL");
        }
      }
    } catch (error) {
      console.error("❌ PRIVACY: Failed to open privacy policy:", error);
      throw error;
    }
  }

  /**
   * Validate that privacy policy URL is accessible
   * Health Connect requires this for app registration
   */
  async validatePrivacyPolicyAccess(): Promise<boolean> {
    try {

      // Test if URL can be opened
      const canOpen = await Linking.canOpenURL(this.PRIVACY_POLICY_URL);

      if (!canOpen) {
        return false;
      }

      // Optional: Test HTTP request to verify URL exists
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(this.PRIVACY_POLICY_URL, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status >= 200 && response.status < 400) {
          return true;
        } else {
          return false;
        }
      } catch (fetchError) {
        return true;
      }
    } catch (error) {
      console.error("❌ PRIVACY: Privacy policy validation failed:", error);
      return false;
    }
  }

  /**
   * Get privacy policy URL for display or sharing
   */
  getPrivacyPolicyUrl(): string {
    return this.PRIVACY_POLICY_URL;
  }

  /**
   * Health Connect compliance check
   * Verifies all requirements for privacy policy handling
   */
  async validateHealthConnectCompliance(): Promise<{
    isCompliant: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check 1: Privacy policy URL accessibility
      const isAccessible = await this.validatePrivacyPolicyAccess();
      if (!isAccessible) {
        issues.push("Privacy policy URL is not accessible");
        recommendations.push(
          "Ensure https://fitai.app/privacy is accessible and returns valid content",
        );
      }

      // Check 2: Intent handling capability
      const canHandleIntents = await Linking.canOpenURL("https://example.com");
      if (!canHandleIntents) {
        issues.push("App cannot handle URL intents");
        recommendations.push(
          "Check app configuration for URL handling capabilities",
        );
      }

      // Check 3: WebBrowser availability (for better UX)
      try {
        // Test WebBrowser availability
        await WebBrowser.warmUpAsync();
      } catch {
        // WebBrowser not available, will use system browser
      }

      const isCompliant = issues.length === 0;

      if (!isCompliant) {
        console.error(
          "❌ PRIVACY: Health Connect compliance issues detected:",
          issues,
        );
      }

      return {
        isCompliant,
        issues,
        recommendations,
      };
    } catch (error) {
      console.error("❌ PRIVACY: Compliance validation failed:", error);
      return {
        isCompliant: false,
        issues: [`Validation error: ${error}`],
        recommendations: [
          "Check privacy policy URL configuration",
          "Verify app intent handling setup",
          "Test privacy policy accessibility",
        ],
      };
    }
  }
}

// Export singleton instance
export const privacyPolicyHandler = new PrivacyPolicyHandler();
export default privacyPolicyHandler;
