/**
 * useAboutFitAILogic - Business logic for AboutFitAI screen
 */

import { useCallback } from "react";
import { Alert, Linking } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { haptics } from "../utils/haptics";
import { Ionicons } from "@expo/vector-icons";

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
      color: "#667eea",
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
      color: "#9C27B0",
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

  const handleRateApp = useCallback(() => {
    Alert.alert(
      "Rate FitAI",
      "Thank you for using FitAI! Your feedback helps us improve.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Rate on App Store",
          onPress: () => {
            haptics.success();
            Alert.alert(
              "App Store",
              "App Store link will be available after app publication.",
            );
          },
        },
      ],
    );
  }, []);

  const handleShareApp = useCallback(() => {
    Alert.alert(
      "Share FitAI",
      "Invite your friends to join you on your fitness journey!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Share",
          onPress: () => {
            haptics.success();
            Alert.alert("Share", "Native sharing will be implemented here.");
          },
        },
      ],
    );
  }, []);

  const handleWebsite = useCallback(() => {
    haptics.light();
    Linking.openURL("https://fitai.app");
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
      Linking.openURL(url).catch(() => {
        Alert.alert("Error", "Could not open social media link.");
      });
    }
  }, []);

  const handleTermsOfService = useCallback(() => {
    haptics.light();
    Linking.openURL("https://fitai.app/terms").catch(() =>
      Alert.alert(
        "Terms of Service",
        "Visit https://fitai.app/terms to view our Terms of Service.",
      ),
    );
  }, []);

  const handlePrivacyPolicy = useCallback(() => {
    haptics.light();
    Linking.openURL("https://fitai.app/privacy").catch(() =>
      Alert.alert(
        "Privacy Policy",
        "Visit https://fitai.app/privacy to view our Privacy Policy.",
      ),
    );
  }, []);

  const handleOpenSourceLicenses = useCallback(() => {
    haptics.light();
    Linking.openURL("https://fitai.app/licenses").catch(() =>
      Alert.alert(
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
  }, []);

  return {
    appVersion,
    buildNumber,
    features,
    handleRateApp,
    handleShareApp,
    handleWebsite,
    handleSocialMedia,
    handleTermsOfService,
    handlePrivacyPolicy,
    handleOpenSourceLicenses,
  };
};
