import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import { usePaywall } from "../../hooks/usePaywall";
import { GlassButton } from "../ui/aurora/GlassButton";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { UsageCounter } from "./UsageCounter";
import { flatColors as colors, surface, border, typography } from "../../theme/aurora-tokens";

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
  barcode_scan: "You've reached your daily AI food scan limit",
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

  const canUse = canUseFeature(featureKey);

  if (!isInitialized && fallback) {
    return <>{fallback}</>;
  }

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
        <View style={styles.gatePanel}>
          <View style={styles.iconContainer}>
            <Ionicons name="diamond" size={rf(28)} color={colors.primaryLight} />
          </View>

          <Text style={styles.title} accessibilityRole="header">{upgradeText}</Text>

          <Text style={styles.description}>
            {upgradeDescription ?? FEATURE_MESSAGES[featureKey]}
          </Text>

          <UsageCounter
            featureKey={featureKey}
            variant="detailed"
            showLabel={false}
          />

          <GlassButton
            label="Upgrade to Premium"
            onPress={() => {
              haptics.light();
              triggerPaywall(FEATURE_MESSAGES[featureKey]);
            }}
            variant="primary"
            fullWidth
            accessibilityLabel="Upgrade to premium"
            style={styles.upgradeButton}
          />
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
  gatePanel: {
    backgroundColor: surface[1],
    borderRadius: rw(16),
    padding: rw(24),
    alignItems: "center",
    borderWidth: 1,
    borderColor: border.subtle,
  },
  iconContainer: {
    width: rw(64),
    height: rw(64),
    borderRadius: rbr(18),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rh(16),
    // Accent-tinted chip with hairline — flat, not a gradient disc.
    backgroundColor: colors.primaryTint,
    borderWidth: 1,
    borderColor: colors.primaryFaded,
  },
  title: {
    ...typography.variants.sectionTitle,
    color: colors.text,
    marginBottom: rh(8),
    textAlign: "center",
  },
  description: {
    ...typography.variants.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: rh(16),
    lineHeight: rf(20),
  },
  upgradeButton: {
    marginTop: rh(16),
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
