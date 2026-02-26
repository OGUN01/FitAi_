/**
 * useAboutFitAILogic - Business logic for AboutFitAI screen
 */

import { useCallback } from "react";
import { Alert, Linking, Platform } from "react-native";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { haptics } from "../utils/haptics";
import { Ionicons } from "@expo/vector-icons";

const openUrl = (url: string) => {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
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

  const handleRateApp = useCallback(() => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        "Rate FitAI\n\nThank you for using FitAI! Your feedback helps us improve.\n\nClick OK to rate on the App Store."
      );
      if (confirmed) {
        haptics.success();
        Alert.alert(
          "App Store",
          "App Store link will be available after app publication.",
        );
      }
    } else {
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
    }
  }, []);

  const handleShareApp = useCallback(() => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        "Share FitAI\n\nInvite your friends to join you on your fitness journey!\n\nClick OK to share."
      );
      if (confirmed) {
        haptics.success();
        Alert.alert("Share", "Native sharing will be implemented here.");
      }
    } else {
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
        window.open(url, '_blank');
      } else {
        Linking.openURL(url).catch(() => {
          Alert.alert("Error", "Could not open social media link.");
        });
      }
    }
  }, []);

  const handleTermsOfService = useCallback(() => {
    haptics.light();
    const url = "https://fitai.app/terms";
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        Alert.alert(
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
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        Alert.alert(
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
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
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
    }
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
