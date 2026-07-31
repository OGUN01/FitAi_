import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import { rf, rp, rbr } from "../../utils/responsive";
import { flatColors as colors } from "../../theme/aurora-tokens";
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

// Editorial Dark: one flat accent fill per tier (no gradient filler). Each
// tier maps to a single token color — the badge is a hairline-bordered chip,
// not a gradient pill.
const TIER_COLOR: Record<string, string> = {
  pro: colors.primaryLight,
  basic: colors.successAlt,
  free: colors.warningAlt,
};

const TIER_LABELS: Record<string, string> = {
  pro: "PRO",
  basic: "BASIC",
  free: "FREE",
};

// Tier iconography uses the Ionicons system (diamond/tier badges) instead of
// emoji, per the 2026 icon-system standard.
const TIER_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pro: "diamond",
  basic: "star",
  free: "star",
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
  const tierColor = TIER_COLOR[tier] ?? TIER_COLOR.free;
  const tierLabel = TIER_LABELS[tier] ?? "FREE";
  const tierIcon = TIER_ICONS[tier] ?? "star";

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          containerPadding: { paddingHorizontal: rp(8), paddingVertical: rp(4) },
          textStyle: { fontSize: rf(12) },
          iconSize: rf(12),
        };
      case "large":
        return {
          containerPadding: { paddingHorizontal: rp(16), paddingVertical: rp(8) },
          textStyle: { fontSize: rf(16), fontWeight: "700" as const },
          iconSize: rf(16),
        };
      default:
        return {
          containerPadding: { paddingHorizontal: rp(12), paddingVertical: rp(6) },
          textStyle: { fontSize: rf(14), fontWeight: "600" as const },
          iconSize: rf(14),
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (variant === "badge") {
    if (!isActive && tier === "free") {
      return (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Upgrade to premium">
          <View
            style={[
              styles.badgeContainer,
              styles.badgeAccentBorder,
              sizeStyles.containerPadding,
            ]}
          >
            <Ionicons
              name="star"
              size={sizeStyles.iconSize}
              color={tierColor}
              style={styles.icon}
            />
            <Text style={[styles.badgeText, { color: tierColor }, sizeStyles.textStyle]}>
              Upgrade
            </Text>
          </View>
        </Pressable>
      );
    }

    return (
      <View style={styles.badgeWithUsage}>
        <View
          style={[
            styles.badgeContainer,
            styles.badgeAccentBorder,
            sizeStyles.containerPadding,
          ]}
        >
          <Ionicons
            name={tierIcon}
            size={sizeStyles.iconSize}
            color={tierColor}
            style={styles.icon}
          />
          <Text style={[styles.badgeText, { color: tierColor }, sizeStyles.textStyle]}>
            {tierLabel}
          </Text>
        </View>
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
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to premium"
        >
          <View style={[styles.banner, { borderColor: tierColor }]}>
            <View style={styles.bannerContent}>
              <View style={styles.bannerTextContainer}>
                <View style={styles.bannerHeader}>
                  <Ionicons name="star" size={rf(22)} color={tierColor} style={styles.bannerIconGlyph} />
                  <Text style={[styles.bannerTitle, { color: tierColor }]}>Upgrade to Premium</Text>
                </View>
                <Text style={styles.bannerSubtitle}>
                  Unlock unlimited AI workouts, advanced analytics, and more!
                </Text>
              </View>
              <View style={[styles.bannerButton, { backgroundColor: tierColor }]}>
                <Text style={styles.bannerButtonText}>Upgrade</Text>
              </View>
            </View>
          </View>
        </Pressable>
      );
    }

    return (
      <View style={[styles.banner, { borderColor: tierColor }]}>
        <View style={styles.bannerContent}>
          <View style={styles.bannerTextContainer}>
            <View style={styles.bannerHeader}>
              <Ionicons name={tierIcon} size={rf(22)} color={tierColor} style={styles.bannerIconGlyph} />
              <Text style={[styles.bannerTitle, { color: tierColor }]}>{tierLabel} Plan Active</Text>
            </View>
            <Text style={styles.bannerSubtitle}>
              You have access to all {tier} features
              {currentPeriodEnd &&
                tier !== "pro" &&
                ` until ${new Date(currentPeriodEnd).toLocaleDateString()}`}
            </Text>
          </View>
          <View style={[styles.bannerButton, { backgroundColor: tierColor }]}>
            <Text style={styles.bannerButtonText}>{tierLabel}</Text>
          </View>
        </View>
        {showUsage && (
          <View style={styles.bannerUsageRow}>
            <UsageCounter featureKey="ai_generation" variant="compact" />
            <UsageCounter featureKey="barcode_scan" variant="compact" />
          </View>
        )}
      </View>
    );
  }

  if (variant === "inline") {
    if (!isActive && tier === "free") {
      return (
        <Pressable
          onPress={onPress}
          style={styles.inlineContainer}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to premium"
        >
          <Ionicons name="star" size={rf(16)} color={tierColor} style={styles.inlineIcon} />
          <Text style={[styles.inlineText, { color: tierColor }]}>Upgrade to Premium</Text>
        </Pressable>
      );
    }

    return (
      <View style={styles.inlineContainer}>
        <Ionicons name={tierIcon} size={rf(16)} color={tierColor} style={styles.inlineIcon} />
        <Text style={[styles.inlineText, { color: tierColor }]}>
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
  // Hairline-bordered chip with accent text — flat, no gradient fill.
  badgeAccentBorder: {
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassSurface,
  },
  badgeText: { fontWeight: "600" },
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
    borderWidth: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerTextContainer: { flex: 1 },
  bannerHeader: { flexDirection: "row", alignItems: "center" },
  bannerIconGlyph: { marginRight: rp(8) },
  bannerTitle: { fontWeight: "700", fontSize: rf(18) },
  bannerSubtitle: {
    color: colors.textSecondary,
    fontSize: rf(14),
    marginTop: rp(4),
  },
  bannerButton: {
    borderRadius: rbr(9999),
    paddingHorizontal: rp(16),
    paddingVertical: rp(8),
  },
  bannerButtonText: { color: colors.background, fontWeight: "700", fontSize: rf(14) },
  bannerUsageRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: rp(12),
    paddingTop: rp(12),
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  inlineContainer: { flexDirection: "row", alignItems: "center" },
  inlineIcon: { marginRight: rp(4) },
  inlineText: { fontSize: rf(14), fontWeight: "500" },
  inlineUsageSpacer: { marginLeft: rp(8) },
});

export default PremiumBadge;
