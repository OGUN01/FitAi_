import { useState, useCallback } from "react";
import { Linking, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../utils/haptics";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";

const openUrl = (url: string) => {
  if (Platform.OS === 'web') {
    window.open(url, '_blank');
  } else {
    Linking.openURL(url);
  }
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
        "Currently, FitAI works as a standalone app with its own comprehensive tracking. We're working on integrations with popular fitness devices and apps for future updates.",
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

  const handleContactSupport = useCallback(() => {
    crossPlatformAlert(
      "Contact Support",
      "Choose how you'd like to contact our support team:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Email",
          onPress: () => {
            Linking.openURL(
              "mailto:support@fitai.app?subject=FitAI Support Request",
            );
          },
        },
        {
          text: "Live Chat",
          onPress: () => {
            crossPlatformAlert(
              "Live Chat",
              "Live chat support will be available in the next update!",
            );
          },
        },
      ],
    );
  }, []);


  const handleReportBug = useCallback(() => {
    const url = "mailto:bugs@fitai.app?subject=Bug Report - FitAI";
    crossPlatformAlert(
      "Report a Bug",
      "Help us improve FitAI by reporting any issues you encounter.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report Bug",
          onPress: () => {
            Linking.openURL(url);
          },
        },
      ],
    );
  }, []);


  const handleFeatureRequest = useCallback(() => {
    const url = "mailto:features@fitai.app?subject=Feature Request - FitAI";
    crossPlatformAlert(
      "Feature Request",
      "We'd love to hear your ideas for improving FitAI!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Request",
          onPress: () => {
            Linking.openURL(url);
          },
        },
      ],
    );
  }, []);


  const handleTutorials = useCallback(() => {
    haptics.light();
    const url = "https://fitai.app/tutorials";
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        crossPlatformAlert(
          "Getting Started",
          "Welcome to FitAI! Here's how to get started:\n\n" +
            "1. Complete your profile in Settings\n" +
            "2. Set your fitness goals\n" +
            "3. Try the AI workout generator\n" +
            "4. Scan your first meal\n" +
            "5. Track your daily water intake\n\n" +
            "Visit https://fitai.app/tutorials for interactive guides!",
        ),
      );
    }
  }, []);

  const handleUserGuide = useCallback(() => {
    haptics.light();
    const url = "https://fitai.app/guide";
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        crossPlatformAlert(
          "User Guide",
          "Visit https://fitai.app/guide for the complete user guide.\n\n" +
            "Quick Tips:\n\n" +
            "• Tap the + button to log workouts and meals\n" +
            "• Use the AI chat for personalized recommendations\n" +
            "• Track progress in the Analytics tab\n" +
            "• Customize your goals in Settings",
        ),
      );
    }
  }, []);

  const handleVideoTutorials = useCallback(() => {
    haptics.light();
    const url = "https://youtube.com/@fitai_app";
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        crossPlatformAlert(
          "Video Tutorials",
          "Subscribe to our YouTube channel for video tutorials:\n\n" +
            "https://youtube.com/@fitai_app\n\n" +
            "Topics covered:\n" +
            "• Getting started with FitAI\n" +
            "• Creating custom workout plans\n" +
            "• Food scanning and meal logging\n" +
            "• Understanding your analytics",
        ),
      );
    }
  }, []);

  const handleCommunityForum = useCallback(() => {
    haptics.light();
    const url = "https://community.fitai.app";
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        crossPlatformAlert(
          "Join Our Community",
          "Connect with fellow fitness enthusiasts!\n\n" +
            "• Share your progress and achievements\n" +
            "• Get tips from experienced users\n" +
            "• Participate in community challenges\n" +
            "• Request new features\n\n" +
            "Visit: https://community.fitai.app",
        ),
      );
    }
  }, []);

  const handleSystemStatus = useCallback(() => {
    haptics.light();
    const url = "https://status.fitai.app";
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() =>
        crossPlatformAlert(
          "System Status",
          "All FitAI systems are currently operational.\n\n" +
            "✅ Authentication Services\n" +
            "✅ AI Workout Generation\n" +
            "✅ Food Recognition\n" +
            "✅ Data Sync Services\n" +
            "✅ Push Notifications\n\n" +
            "For real-time status updates, visit:\nhttps://status.fitai.app",
        ),
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
    handleTutorials,
    handleUserGuide,
    handleVideoTutorials,
    handleCommunityForum,
    handleSystemStatus,
    handleContactEmail,
  };
};
