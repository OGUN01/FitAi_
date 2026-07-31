/**
 * useAboutFitAILogic - Business logic for AboutFitAI screen
 */

import { useCallback } from "react";
import { Linking, Platform, Share } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { haptics } from "../utils/haptics";
import { Ionicons } from "@expo/vector-icons";

const openUrl = (url: string) => {
  if (Platform.OS === 'web') {
    globalThis.open(url, '_blank');
  } else {
    Linking.openURL(url);
  }
};

export interface FeatureItem {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
}

export const useAboutFitAILogic = () => {
  // Get version from expo-constants (reads from app.config.js/app.json)
  // Falls back to expo-application for native build info
  const appVersion =
    Constants.expoConfig?.version ||
    Application.nativeApplicationVersion ||
    "1.0.0";
  const buildNumber =
    Constants.expoConfig?.android?.versionCode?.toString() ||
    Application.nativeBuildVersion ||
    new Date().toISOString().split("T")[0];

  const features: FeatureItem[] = [
    {
      icon: "sparkles-outline",
      color: "#FF6B35",
      title: "100% AI-Powered",
      description: "Every workout and meal plan is uniquely generated for you",
    },
    {
      icon: "flag-outline",
      color: "#4CAF50",
      title: "Personalized Goals",
      description: "Tailored fitness plans based on your specific objectives",
    },
    {
      icon: "analytics-outline",
      color: "#FF9800",
      title: "Smart Tracking",
      description: "Comprehensive progress monitoring and analytics",
    },
    {
      icon: "nutrition-outline",
      color: "#FF6B6B",
      title: "Nutrition Planning",
      description: "AI-generated meal plans with macro tracking",
    },
    {
      icon: "barbell-outline",
      color: "#FF6B35",
      title: "Adaptive Workouts",
      description: "Exercises that evolve with your fitness level",
    },
    {
      icon: "sync-outline",
      color: "#2196F3",
      title: "Real-time Sync",
      description: "Seamless data synchronization across all devices",
    },
  ];

  const handleShareApp = useCallback(async () => {
    haptics.success();
    const shareUrl = "https://fitai.app";
    const shareMessage =
      "Check out FitAI — your AI-powered fitness companion! Personalized workouts, AI meal plans, and smart progress tracking. https://fitai.app";
    try {
      if (Platform.OS === "web") {
        const nav = globalThis.navigator;
        if (typeof nav?.share === "function") {
          await nav.share({ title: "FitAI", text: shareMessage, url: shareUrl });
        } else if (nav?.clipboard) {
          await nav.clipboard.writeText(shareMessage);
          crossPlatformAlert(
            "Link Copied",
            "Share link copied to your clipboard — paste it anywhere to invite friends.",
          );
        } else {
          crossPlatformAlert(
            "Share FitAI",
            "Copy this link to invite friends: https://fitai.app",
          );
        }
      } else {
        await Share.share({ message: shareMessage });
      }
    } catch (error) {
      // User dismissing the share sheet also rejects on some platforms — not an error.
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("[useAboutFitAILogic] Share failed:", error);
    }
  }, []);

  const handleWebsite = useCallback(() => {
    haptics.light();
    openUrl("https://fitai.app");
  }, []);

  const handleSocialMedia = useCallback((platform: string) => {
    const urls: Record<string, string> = {
      twitter: "https://twitter.com/fitai_app",
      instagram: "https://instagram.com/fitai_app",
      facebook: "https://facebook.com/fitai.app",
    };

    const url = urls[platform];
    if (url) {
      haptics.light();
      if (Platform.OS === 'web') {
        globalThis.open(url, '_blank');
      } else {
        Linking.openURL(url).catch(() => {
          crossPlatformAlert("Error", "Could not open social media link.");
        });
      }
    }
  }, []);

  const handleTermsOfService = useCallback(() => {
    haptics.light();
    const url = "https://fitai.app/terms";
    if (Platform.OS === 'web') {
      globalThis.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        crossPlatformAlert(
          "Terms of Service",
          "Visit https://fitai.app/terms to view our Terms of Service.",
        ),
      );
    }
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    haptics.light();
    const url = "https://fitai.app/privacy";
    if (Platform.OS === 'web') {
      globalThis.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        crossPlatformAlert(
          "Privacy Policy",
          "Visit https://fitai.app/privacy to view our Privacy Policy.",
        ),
      );
    }
  }, []);

  const handleOpenSourceLicenses = useCallback(() => {
    haptics.light();
    const url = "https://fitai.app/licenses";
    if (Platform.OS === 'web') {
      globalThis.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        crossPlatformAlert(
          "Open Source Licenses",
          "FitAI uses the following open source libraries:\n\n" +
            "• React Native (MIT)\n" +
            "• Expo (MIT)\n" +
            "• Zustand (MIT)\n" +
            "• React Navigation (MIT)\n" +
            "• Supabase JS (MIT)\n" +
            "• And many more...\n\n" +
            "Visit https://fitai.app/licenses for the complete list.",
        ),
      );
    }
  }, []);

  return {
    appVersion,
    buildNumber,
    features,
    handleShareApp,
    handleWebsite,
    handleSocialMedia,
    handleTermsOfService,
    handlePrivacyPolicy,
    handleOpenSourceLicenses,
  };
};
