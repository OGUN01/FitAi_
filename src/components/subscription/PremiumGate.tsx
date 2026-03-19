import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import { usePaywall } from "../../hooks/usePaywall";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { UsageCounter } from "./UsageCounter";
import { ResponsiveTheme } from "../../utils/constants";

type FeatureKey = "ai_generation" | "barcode_scan";

interface PremiumGateProps {
  featureKey: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
  showUsageCounter?: boolean;
  upgradeText?: string;
  upgradeDescription?: string;
}

const FEATURE_MESSAGES: Record<FeatureKey, string> = {
  ai_generation: "You've reached your AI generation limit this month",
  barcode_scan: "You've reached your daily food scan limit",
};

const PremiumGate: React.FC<PremiumGateProps> = ({
  featureKey,
  children,
  fallback,
  showUpgrade = true,
  showUsageCounter = true,
  upgradeText = "Upgrade to Continue",
  upgradeDescription,
}) => {
  const canUseFeature = useSubscriptionStore((s) => s.canUseFeature);
  const isInitialized = useSubscriptionStore((s) => s.isInitialized);
  const { triggerPaywall } = usePaywall();

  if (!isInitialized) {
    return <>{children}</>;
  }

  const canUse = canUseFeature(featureKey);

  if (canUse) {
    return (
      <View>
        {children}
        {showUsageCounter && (
          <View style={styles.usageCounterRow}>
            <UsageCounter featureKey={featureKey} variant="compact" />
          </View>
        )}
      </View>
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgrade) {
    return (
      <View style={styles.container}>
        <View style={styles.blurOverlay}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>👑</Text>
          </View>

          <Text style={styles.title}>{upgradeText}</Text>

          <Text style={styles.description}>
            {upgradeDescription ?? FEATURE_MESSAGES[featureKey]}
          </Text>

          <UsageCounter
            featureKey={featureKey}
            variant="detailed"
            showLabel={false}
          />

          <AnimatedPressable
            onPress={() => {
              haptics.light();
              triggerPaywall(FEATURE_MESSAGES[featureKey]);
            }}
            style={styles.upgradeButton}
          >
            <LinearGradient
              colors={[ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeGradient}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: rw(16),
    overflow: "hidden",
    margin: rw(16),
  },
  blurOverlay: {
    backgroundColor: "rgba(26, 31, 46, 0.95)",
    borderRadius: rw(16),
    padding: rw(24),
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
  },
  iconContainer: {
    backgroundColor: "rgba(255, 107, 53, 0.15)",
    borderRadius: rbr(9999),
    padding: rw(12),
    marginBottom: rh(16),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primaryFaded,
  },
  iconText: {
    fontSize: rf(32),
  },
  title: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(8),
    textAlign: "center",
  },
  description: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: rh(16),
    lineHeight: rf(20),
  },
  upgradeButton: {
    marginTop: rh(16),
    borderRadius: rw(16),
    overflow: "hidden",
    width: "100%",
  },
  upgradeGradient: {
    paddingVertical: rh(14),
    paddingHorizontal: rw(24),
    alignItems: "center",
    borderRadius: rw(16),
  },
  upgradeButtonText: {
    color: ResponsiveTheme.colors.text,
    fontWeight: "700",
    fontSize: rf(16),
  },
  usageCounterRow: {
    paddingHorizontal: rw(16),
    paddingTop: rh(8),
    alignItems: "flex-end",
  },
});

export const withPremiumGate = (
  featureKey: FeatureKey,
  upgradeProps?: Partial<PremiumGateProps>,
) => {
  return function PremiumWrapped<T extends object>(
    Component: React.ComponentType<T>,
  ): React.ComponentType<T> {
    return function PremiumGatedComponent(props: T) {
      return (
        <PremiumGate featureKey={featureKey} {...upgradeProps}>
          <Component {...props} />
        </PremiumGate>
      );
    };
  };
};

export const usePremiumFeature = (featureKey: FeatureKey) => {
  const canUseFeatureFn = useSubscriptionStore((s) => s.canUseFeature);
  const isPremiumFn = useSubscriptionStore((s) => s.isPremium);
  const { triggerPaywall } = usePaywall();

  const hasAccess = canUseFeatureFn(featureKey);

  return {
    hasAccess,
    isPremium: isPremiumFn(),
    requireAccess: () => hasAccess,
    checkLimit: () => !hasAccess,
    getLimit: () => {
      const { usage, features } = useSubscriptionStore.getState();
      if (featureKey === "ai_generation") {
        return features.unlimited_ai
          ? Infinity
          : (usage.ai_generation.monthly.limit ?? Infinity);
      }
      return features.unlimited_scans
        ? Infinity
        : (usage.barcode_scan.daily.limit ?? Infinity);
    },
    showPaywall: () => triggerPaywall(FEATURE_MESSAGES[featureKey]),
  };
};

export default PremiumGate;
