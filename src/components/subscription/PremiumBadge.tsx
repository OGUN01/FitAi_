import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import { rf, rp, rbr } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { UsageCounter } from "./UsageCounter";

// ============================================================================
// Types
// ============================================================================

interface PremiumBadgeProps {
  onPress?: () => void;
  size?: "small" | "medium" | "large";
  showUsage?: boolean;
  variant?: "badge" | "banner" | "inline";
}

// ============================================================================
// Constants
// ============================================================================

const TIER_GRADIENTS: Record<string, readonly [string, string, ...string[]]> = {
  pro: [ResponsiveTheme.colors.primaryLight, ResponsiveTheme.colors.pink],
  basic: [ResponsiveTheme.colors.successBright, ResponsiveTheme.colors.blue],
  free: [ResponsiveTheme.colors.amberBright, ResponsiveTheme.colors.orange],
};

const TIER_LABELS: Record<string, string> = {
  pro: "PRO",
  basic: "BASIC",
  free: "FREE",
};

const TIER_ICONS: Record<string, string> = {
  pro: "👑",
  basic: "⭐",
  free: "⭐",
};

// ============================================================================
// Component
// ============================================================================

const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  onPress,
  size = "medium",
  showUsage = false,
  variant = "badge",
}) => {
  const { currentPlan, isPremium, currentPeriodEnd } = useSubscriptionStore();

  const tier = currentPlan?.tier ?? "free";
  const isActive = isPremium();
  const gradientColors = TIER_GRADIENTS[tier] ?? TIER_GRADIENTS.free;
  const tierLabel = TIER_LABELS[tier] ?? "FREE";
  const tierIcon = TIER_ICONS[tier] ?? "⭐";

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          containerPadding: { paddingHorizontal: rp(8), paddingVertical: rp(4) },
          textStyle: { fontSize: rf(12) },
          iconStyle: { fontSize: rf(14) },
        };
      case "large":
        return {
          containerPadding: { paddingHorizontal: rp(16), paddingVertical: rp(8) },
          textStyle: { fontSize: rf(16), fontWeight: "700" as const },
          iconStyle: { fontSize: rf(18) },
        };
      default:
        return {
          containerPadding: { paddingHorizontal: rp(12), paddingVertical: rp(6) },
          textStyle: { fontSize: rf(14), fontWeight: "600" as const },
          iconStyle: { fontSize: rf(16) },
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (variant === "badge") {
    if (!isActive && tier === "free") {
      return (
        <Pressable onPress={onPress}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.badgeContainer, sizeStyles.containerPadding]}
          >
            <Text style={[styles.icon, sizeStyles.iconStyle]}>⭐</Text>
            <Text style={[styles.badgeText, sizeStyles.textStyle]}>
              Upgrade
            </Text>
          </LinearGradient>
        </Pressable>
      );
    }

    return (
      <View style={styles.badgeWithUsage}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.badgeContainer, sizeStyles.containerPadding]}
        >
          <Text style={[styles.icon, sizeStyles.iconStyle]}>{tierIcon}</Text>
          <Text style={[styles.badgeText, sizeStyles.textStyle]}>
            {tierLabel}
          </Text>
        </LinearGradient>
        {showUsage && (
          <UsageCounter
            featureKey="ai_generation"
            variant="compact"
            showLabel={false}
          />
        )}
      </View>
    );
  }

  if (variant === "banner") {
    if (!isActive && tier === "free") {
      return (
        <Pressable onPress={onPress}>
          <LinearGradient
            colors={TIER_GRADIENTS.free}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextContainer}>
                <View style={styles.bannerHeader}>
                  <Text style={styles.bannerIcon}>⭐</Text>
                  <Text style={styles.bannerTitle}>Upgrade to Premium</Text>
                </View>
                <Text style={styles.bannerSubtitle}>
                  Unlock unlimited AI workouts, advanced analytics, and more!
                </Text>
              </View>
              <View style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Upgrade</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      );
    }

    return (
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.banner}
      >
        <View style={styles.bannerContent}>
          <View style={styles.bannerTextContainer}>
            <View style={styles.bannerHeader}>
              <Text style={styles.bannerIcon}>{tierIcon}</Text>
              <Text style={styles.bannerTitle}>{tierLabel} Plan Active</Text>
            </View>
            <Text style={styles.bannerSubtitle}>
              You have access to all {tier} features
              {currentPeriodEnd &&
                tier !== "pro" &&
                ` until ${new Date(currentPeriodEnd).toLocaleDateString()}`}
            </Text>
          </View>
          <View style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>{tierLabel}</Text>
          </View>
        </View>
        {showUsage && (
          <View style={styles.bannerUsageRow}>
            <UsageCounter featureKey="ai_generation" variant="compact" />
            <UsageCounter featureKey="barcode_scan" variant="compact" />
          </View>
        )}
      </LinearGradient>
    );
  }

  if (variant === "inline") {
    if (!isActive && tier === "free") {
      return (
        <Pressable onPress={onPress} style={styles.inlineContainer}>
          <Text style={styles.inlineIconYellow}>⭐</Text>
          <Text style={styles.inlineTextYellow}>Upgrade to Premium</Text>
        </Pressable>
      );
    }

    const colorMap: Record<string, typeof styles.inlineTextPurple> = {
      pro: styles.inlineTextPurple,
      basic: styles.inlineTextGreen,
    };

    return (
      <View style={styles.inlineContainer}>
        <Text style={styles.inlineIconYellow}>{tierIcon}</Text>
        <Text style={[colorMap[tier] ?? styles.inlineTextGreen]}>
          {tierLabel}
        </Text>
        {showUsage && (
          <View style={styles.inlineUsageSpacer}>
            <UsageCounter
              featureKey="ai_generation"
              variant="compact"
              showLabel={false}
            />
          </View>
        )}
      </View>
    );
  }

  return null;
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: rbr(9999),
  },
  badgeText: { color: ResponsiveTheme.colors.white },
  badgeWithUsage: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
  },
  icon: { marginRight: rp(4) },
  banner: {
    padding: rp(16),
    borderRadius: rbr(16),
    marginHorizontal: rp(16),
    marginVertical: rp(8),
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTextContainer: { flex: 1 },
  bannerHeader: { flexDirection: "row", alignItems: "center" },
  bannerIcon: { fontSize: rf(24), marginRight: rp(8) },
  bannerTitle: { color: ResponsiveTheme.colors.white, fontWeight: "700", fontSize: rf(18) },
  bannerSubtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: rf(14),
    marginTop: rp(4),
  },
  bannerButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: rbr(9999),
    paddingHorizontal: rp(16),
    paddingVertical: rp(8),
  },
  bannerButtonText: { color: ResponsiveTheme.colors.white, fontWeight: "700", fontSize: rf(14) },
  bannerUsageRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: rp(12),
    paddingTop: rp(12),
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  inlineContainer: { flexDirection: "row", alignItems: "center" },
  inlineIconYellow: { fontSize: rf(16), marginRight: rp(4) },
  inlineTextYellow: { color: ResponsiveTheme.colors.warningAlt, fontSize: rf(14), fontWeight: "500" },
  inlineTextPurple: { color: ResponsiveTheme.colors.purple, fontSize: rf(14), fontWeight: "500" },
  inlineTextGreen: { color: ResponsiveTheme.colors.successAlt, fontSize: rf(14), fontWeight: "500" },
  inlineUsageSpacer: { marginLeft: rp(8) },
});

export default PremiumBadge;
