// Premium Feature Gate Component
// Conditionally render content based on subscription status

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  useSubscriptionStore,
  subscriptionHelpers,
} from "../../stores/subscriptionStore";
import PremiumBadge from "./PremiumBadge";

interface PremiumGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
  upgradeText?: string;
  upgradeDescription?: string;
}

const PremiumGate: React.FC<PremiumGateProps> = ({
  feature,
  children,
  fallback,
  showUpgrade = true,
  upgradeText = "Upgrade to Premium",
  upgradeDescription = "This feature requires a premium subscription",
}) => {
  const { checkPremiumAccess, showPaywallModal } = useSubscriptionStore();

  const hasAccess = checkPremiumAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgrade) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>👑</Text>
        </View>

        <Text style={styles.title}>{upgradeText}</Text>

        <Text style={styles.description}>{upgradeDescription}</Text>

        <Pressable
          onPress={() => showPaywallModal(feature)}
          style={styles.upgradeButton}
        >
          <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
        </Pressable>

        <View style={styles.badgeContainer}>
          <PremiumBadge
            size="small"
            variant="inline"
            onPress={() => showPaywallModal(feature)}
          />
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 24,
    margin: 16,
    alignItems: "center",
  },
  iconContainer: {
    backgroundColor: "#FEF3C7",
    borderRadius: 9999,
    padding: 12,
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  upgradeButton: {
    backgroundColor: "#F97316",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    alignItems: "center",
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  badgeContainer: {
    marginTop: 16,
  },
});

export const withPremiumGate = (
  feature: string,
  upgradeProps?: Partial<PremiumGateProps>,
) => {
  return function PremiumWrapped<T extends {}>(
    Component: React.ComponentType<T>,
  ): React.ComponentType<T> {
    return function PremiumGatedComponent(props: T) {
      return (
        <PremiumGate feature={feature} {...upgradeProps}>
          <Component {...props} />
        </PremiumGate>
      );
    };
  };
};

export const usePremiumFeature = (feature: string) => {
  const { checkPremiumAccess, showPaywallModal } = useSubscriptionStore();

  const hasAccess = checkPremiumAccess(feature);

  const requireAccess = (showPaywall = true, trackUsage = true) => {
    if (trackUsage) {
      subscriptionHelpers.trackPremiumFeatureUsage(feature, {
        attempted: true,
      });
    }

    const access = subscriptionHelpers.requiresPremium(feature, showPaywall);
    return access;
  };

  const checkLimit = (currentUsage: number) => {
    return subscriptionHelpers.hasReachedLimit(feature, currentUsage);
  };

  const getLimit = () => {
    return subscriptionHelpers.getFeatureLimit(feature);
  };

  return {
    hasAccess,
    requireAccess,
    checkLimit,
    getLimit,
    showPaywall: () => showPaywallModal(feature),
  };
};

export default PremiumGate;
