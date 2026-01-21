// Subscription Management Screen
// View and manage premium subscription

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import PremiumBadge from "../../components/subscription/PremiumBadge";
import PaywallModal from "../../components/subscription/PaywallModal";

const SubscriptionScreen: React.FC = () => {
  const {
    isLoading,
    subscriptionStatus,
    availablePlans,
    trialInfo,
    showPaywall,
    showPaywallModal,
    hidePaywallModal,
    restorePurchases,
    getSubscriptionAnalytics,
  } = useSubscriptionStore();

  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    // Load subscription analytics
    const data = getSubscriptionAnalytics();
    setAnalytics(data);
  }, [getSubscriptionAnalytics]);

  const handleManageSubscription = () => {
    const url = Platform.select({
      ios: "https://apps.apple.com/account/subscriptions",
      android: "https://play.google.com/store/account/subscriptions",
      default: "https://support.google.com/googleplay/answer/7018481",
    });

    Alert.alert(
      "Manage Subscription",
      "You will be redirected to your app store to manage your subscription.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => Linking.openURL(url),
        },
      ],
    );
  };

  const handleRestorePurchases = async () => {
    Alert.alert(
      "Restore Purchases",
      "This will restore any previous purchases made with this Apple/Google account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            await restorePurchases();
            Alert.alert(
              "Restore Complete",
              "Your purchases have been restored.",
            );
          },
        },
      ],
    );
  };

  const getPremiumFeatures = () => [
    { icon: "🚀", text: "Unlimited AI workout generation" },
    { icon: "🍽️", text: "Advanced meal planning with macros" },
    { icon: "📊", text: "Detailed analytics and insights" },
    { icon: "🏆", text: "Exclusive achievements and badges" },
    { icon: "💪", text: "Personalized coaching recommendations" },
    { icon: "🎯", text: "Advanced goal setting and tracking" },
    { icon: "📱", text: "Multiple device sync" },
    { icon: "🌙", text: "Dark mode and premium themes" },
    { icon: "📈", text: "Export workout and nutrition data" },
    { icon: "🔔", text: "Smart notifications and reminders" },
    { icon: "🎵", text: "Premium workout music integration" },
    { icon: "📸", text: "Progress photo analysis with AI" },
    { icon: "🏃‍♂️", text: "Advanced wearable integration" },
    { icon: "👥", text: "Premium community features" },
    { icon: "❌", text: "Remove all ads" },
  ];

  if (isLoading) {
    return (
      <View>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text>Loading subscription details...</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      {/* Header */}
      <View>
        <View>
          <View>
            <Text>FitAI Premium</Text>
            <Text>Your subscription status</Text>
          </View>

          <View>
            <PremiumBadge size="large" variant="badge" />
          </View>
        </View>
      </View>

      {/* Current Status */}
      <View>
        <View>
          <Text>Current Status</Text>

          <View>
            <View>
              <Text>Plan</Text>
              <Text>
                {subscriptionStatus.plan === "free"
                  ? "Free Tier"
                  : subscriptionStatus.plan}
              </Text>
            </View>

            {subscriptionStatus.isPremium && (
              <>
                {subscriptionStatus.purchaseDate && (
                  <View>
                    <Text>Started</Text>
                    <Text>
                      {new Date(
                        subscriptionStatus.purchaseDate,
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                {subscriptionStatus.expiryDate &&
                  subscriptionStatus.plan !== "lifetime" && (
                    <View>
                      <Text>Expires</Text>
                      <Text>
                        {new Date(
                          subscriptionStatus.expiryDate,
                        ).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                <View>
                  <Text>Auto-Renew</Text>
                  <Text>
                    {subscriptionStatus.autoRenewing ? "Enabled" : "Disabled"}
                  </Text>
                </View>
              </>
            )}

            {trialInfo.daysRemaining > 0 && (
              <View>
                <Text>Trial Days Left</Text>
                <Text>{trialInfo.daysRemaining} days</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Analytics */}
      {analytics && subscriptionStatus.isPremium && (
        <View>
          <View>
            <Text>Your Stats</Text>

            <View>
              <View>
                <Text>{analytics.daysSinceSubscribed}</Text>
                <Text>Days as Premium</Text>
              </View>

              <View>
                <Text>${analytics.totalSpent.toFixed(2)}</Text>
                <Text>Total Invested</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Actions */}
      <View>
        <View>
          {!subscriptionStatus.isPremium && (
            <Pressable onPress={() => showPaywallModal()}>
              <Text>⭐ Upgrade to Premium</Text>
            </Pressable>
          )}

          {subscriptionStatus.isPremium &&
            subscriptionStatus.plan !== "lifetime" && (
              <Pressable onPress={handleManageSubscription}>
                <Text>Manage Subscription</Text>
              </Pressable>
            )}

          <Pressable onPress={handleRestorePurchases}>
            <Text>Restore Purchases</Text>
          </Pressable>
        </View>
      </View>

      {/* Premium Features List */}
      <View>
        <Text>Premium Features</Text>

        <View>
          <View>
            {getPremiumFeatures().map((feature, index) => (
              <View key={index}>
                <Text>{feature.icon}</Text>
                <Text
                  className={`flex-1 ${
                    subscriptionStatus.isPremium
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {feature.text}
                </Text>
                {subscriptionStatus.isPremium && <Text>✓</Text>}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Trial Banner */}
      {trialInfo.isEligible && !subscriptionStatus.isPremium && (
        <View>
          <View>
            <Text>🎁 Start Your Free Trial</Text>
            <Text>
              Try all premium features free for 7-14 days. Cancel anytime.
            </Text>
            <Pressable onPress={() => showPaywallModal()}>
              <Text>Start Free Trial</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Legal Links */}
      <View>
        <View>
          <Pressable onPress={() => {}}>
            <Text>Terms of Service</Text>
          </Pressable>
          <Pressable onPress={() => {}}>
            <Text>Privacy Policy</Text>
          </Pressable>
        </View>
      </View>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={hidePaywallModal}
        title="Upgrade to FitAI Premium"
        description="Unlock unlimited AI workouts, advanced analytics, and premium features!"
      />
    </ScrollView>
  );
};

export default SubscriptionScreen;
