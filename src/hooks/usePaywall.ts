import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useSubscriptionStore } from "../stores/subscriptionStore";
import { SubscriptionPlan } from "../services/SubscriptionService";

export const usePaywall = () => {
  const {
    availablePlans,
    isPurchasing,
    purchaseError,
    trialInfo,
    purchasePlan,
    restorePurchases,
  } = useSubscriptionStore();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);

  useEffect(() => {
    if (availablePlans.length > 0 && !selectedPlan) {
      const yearlyPlan = availablePlans.find((p) => p.period === "yearly");
      setSelectedPlan(yearlyPlan?.id || availablePlans[0]?.id);
    }
  }, [availablePlans, selectedPlan]);

  const handlePurchase = async (onClose: () => void) => {
    if (!selectedPlan) return;

    try {
      const result = await purchasePlan(selectedPlan);

      if (result.success) {
        Alert.alert(
          "🎉 Welcome to Premium!",
          "Your subscription is now active. Enjoy all premium features!",
          [{ text: "Get Started", onPress: onClose }],
        );
      }
    } catch (error) {
      console.error("Purchase error:", error);
    }
  };

  const handleRestore = async () => {
    await restorePurchases();
    Alert.alert(
      "Restore Complete",
      "Your previous purchases have been restored.",
      [{ text: "OK" }],
    );
  };

  const getPlanBadge = (plan: SubscriptionPlan) => {
    if (plan.isPopular) return { text: "🔥 MOST POPULAR", color: "#f97316" };
    if (plan.discount)
      return { text: `${plan.discount}% OFF`, color: "#22c55e" };
    if (plan.period === "lifetime")
      return { text: "⭐ BEST VALUE", color: "#a855f7" };
    return null;
  };

  const getFeatureIcon = (feature: string) => {
    const icons: Record<string, string> = {
      "Unlimited AI workout generation": "🚀",
      "Advanced meal planning": "🍽️",
      "Detailed analytics": "📊",
      "Exclusive achievements": "🏆",
      "Personalized coaching": "💪",
      "Advanced goal setting": "🎯",
      "Multiple device sync": "📱",
      "Dark mode and themes": "🌙",
      "Export data": "📈",
      "Smart notifications": "🔔",
      "Premium music": "🎵",
      "AI photo analysis": "📸",
      "Advanced wearables": "🏃‍♂️",
      "Premium community": "👥",
      "Remove all ads": "❌",
    };

    return icons[feature] || "✨";
  };

  const getFeatureTitle = (feature?: string, defaultTitle?: string) => {
    const titles: Record<string, string> = {
      unlimited_ai: "Unlimited AI Workouts",
      advanced_analytics: "Advanced Analytics",
      custom_themes: "Custom Themes",
      export_data: "Export Your Data",
      premium_achievements: "Premium Achievements",
      advanced_workouts: "Advanced Workouts",
      multi_device_sync: "Multi-Device Sync",
      premium_community: "Premium Community",
    };

    return titles[feature || ""] || defaultTitle || "Upgrade to Premium";
  };

  const selectedPlanData = availablePlans.find((p) => p.id === selectedPlan);

  return {
    selectedPlan,
    selectedPlanData,
    showFeatures,
    availablePlans,
    isPurchasing,
    purchaseError,
    trialInfo,
    setSelectedPlan,
    setShowFeatures,
    handlePurchase,
    handleRestore,
    getPlanBadge,
    getFeatureIcon,
    getFeatureTitle,
  };
};
