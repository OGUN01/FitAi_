/* global window */
import { useState, useCallback } from "react";
import { Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../utils/haptics";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { API_CONFIG } from "../config/api";

const MAIL_FALLBACK_MESSAGE =
  "Could not open your mail app. Please email support@fitai.app directly.";

// Opens a mailto: (or other) URL, guarding against devices with no mail
// client configured (common on tablets/emulators). On failure, surfaces a
// fallback alert instead of silently doing nothing — matches the pattern in
// useAboutFitAILogic.ts and PrivacySecurityScreen.tsx.
const openUrl = (url: string) => {
  if (Platform.OS === "web") {
    try {
      window.open(url, "_blank");
    } catch (error) {
      console.error("[useHelpSupport] Failed to open URL on web:", error);
      crossPlatformAlert("Could Not Open", MAIL_FALLBACK_MESSAGE);
    }
    return;
  }
  Linking.openURL(url).catch((error) => {
    console.error("[useHelpSupport] Failed to open URL:", error);
    crossPlatformAlert("Could Not Open", MAIL_FALLBACK_MESSAGE);
  });
};

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const useHelpSupport = () => {
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const faqs: FAQItem[] = [
    {
      id: "1",
      question: "How do I track my workouts?",
      answer:
        'Go to the Fitness tab and tap "Start Workout". Choose your workout type and follow the guided exercises. The app will automatically track your progress, reps, and time.',
      icon: "barbell-outline",
    },
    {
      id: "2",
      question: "Can I customize my meal plans?",
      answer:
        'Yes! Go to the Diet tab and tap "Customize Meals". You can adjust portion sizes, swap ingredients, and set dietary preferences. The AI will generate personalized meal suggestions based on your goals.',
      icon: "restaurant-outline",
    },
    {
      id: "3",
      question: "How does the AI personalization work?",
      answer:
        "FitAI uses your personal information, fitness goals, and activity history to create 100% personalized content. The more you use the app, the better it gets at understanding your preferences and needs.",
      icon: "sparkles-outline",
    },
    {
      id: "4",
      question: "Can I sync with other fitness apps?",
      answer:
        "Yes! FitAI syncs with Apple Health on iOS and Health Connect on Android, pulling in steps, heart rate, workouts, sleep, and more from your wearables and other fitness apps. Go to Settings > Connect Wearables to set it up.",
      icon: "sync-outline",
    },
    {
      id: "5",
      question: "How do I reset my progress?",
      answer:
        "Go to Profile > Edit Profile > Personal Information and update your goals. Or contact support if you need to completely reset your account data.",
      icon: "refresh-outline",
    },
    {
      id: "6",
      question: "Is my data secure?",
      answer:
        "Yes, we use industry-standard encryption and security measures. Your personal data is never shared without your consent. Check our Privacy Policy for detailed information.",
      icon: "shield-checkmark-outline",
    },
  ];

  const toggleFaq = useCallback((id: string) => {
    haptics.light();
    setExpandedFaq((prev) => (prev === id ? null : id));
  }, []);

  // All mailto actions on this screen (Contact Support, Report Bug, Feature
  // Request, and the ContactCard email button below) open the mail composer
  // directly without a confirmation step — it's a non-destructive action
  // that's trivially cancelled from the composer itself, so a Cancel/Email
  // alert only adds friction. Kept consistent across all four entry points.
  const handleContactSupport = useCallback(() => {
    haptics.light();
    openUrl("mailto:support@fitai.app?subject=FitAI Support Request");
  }, []);


  const handleReportBug = useCallback(() => {
    haptics.light();
    openUrl("mailto:bugs@fitai.app?subject=Bug Report - FitAI");
  }, []);


  const handleFeatureRequest = useCallback(() => {
    haptics.light();
    openUrl("mailto:features@fitai.app?subject=Feature Request - FitAI");
  }, []);


  const handleSystemStatus = useCallback(async () => {
    haptics.light();

    const formatService = (
      label: string,
      service?: { status: string; latency?: number },
    ) => {
      if (!service) return `${label}: unknown`;
      const icon =
        service.status === "up"
          ? "[OK]"
          : service.status === "degraded"
            ? "[DEGRADED]"
            : "[DOWN]";
      return `${label}: ${icon} ${service.status}`;
    };

    try {
      const response = await fetch(`${API_CONFIG.WORKERS_BASE_URL}/health`);
      if (!response.ok && response.status !== 503) {
        throw new Error(`Health check returned HTTP ${response.status}`);
      }
      const data = await response.json();
      const services = data?.services ?? {};

      crossPlatformAlert(
        "System Status",
        `Overall: ${String(data?.status ?? "unknown").toUpperCase()}\n\n` +
          `${formatService("Authentication & Database", services.supabase)}\n` +
          `${formatService("AI Generation & Sync", services.cloudflare_kv)}\n` +
          `${formatService("Media Storage", services.cloudflare_r2)}\n\n` +
          `Checked ${data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "just now"}`,
      );
    } catch (error) {
      console.error("System status check failed:", error);
      crossPlatformAlert(
        "System Status",
        "Could not reach the FitAI status service right now. If you are experiencing issues, please try again later or contact support@fitai.app.",
      );
    }
  }, []);

  const handleContactEmail = useCallback(() => {
    haptics.light();
    openUrl("mailto:support@fitai.app");
  }, []);

  return {
    faqs,
    expandedFaq,
    toggleFaq,
    handleContactSupport,
    handleReportBug,
    handleFeatureRequest,
    handleSystemStatus,
    handleContactEmail,
  };
};
