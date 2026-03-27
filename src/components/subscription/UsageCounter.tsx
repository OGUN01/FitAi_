import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { rf, rp, rbr } from "../../utils/responsive";
import { useSubscriptionStore } from "../../stores/subscriptionStore";
import { ResponsiveTheme } from "../../utils/constants";

// ============================================================================
// Types
// ============================================================================

interface UsageCounterProps {
  featureKey: "ai_generation" | "barcode_scan";
  variant?: "compact" | "detailed";
  showLabel?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const FEATURE_LABELS: Record<UsageCounterProps["featureKey"], string> = {
  ai_generation: "AI Generations",
  barcode_scan: "AI Food Scans",
};

const PERIOD_LABELS: Record<UsageCounterProps["featureKey"], string> = {
  ai_generation: "this month",
  barcode_scan: "today",
};

const COLOR_GREEN = ResponsiveTheme.colors.successAlt;
const COLOR_YELLOW = ResponsiveTheme.colors.warningAlt;
const COLOR_RED = ResponsiveTheme.colors.errorAlt;
const COLOR_MUTED = ResponsiveTheme.colors.muted;

// ============================================================================
// Component
// ============================================================================

export const UsageCounter: React.FC<UsageCounterProps> = ({
  featureKey,
  variant = "compact",
  showLabel = true,
}) => {
  const { usage, features } = useSubscriptionStore();

  const bucket =
    featureKey === "ai_generation"
      ? usage.ai_generation.monthly
      : usage.barcode_scan.daily;

  const isUnlimited =
    featureKey === "ai_generation"
      ? features.unlimited_ai
      : features.unlimited_scans;

  if (isUnlimited || bucket.limit === null) {
    if (variant === "detailed") {
      return (
        <View style={styles.detailedContainer}>
          {showLabel && (
            <Text style={styles.detailedLabel}>
              {FEATURE_LABELS[featureKey]}
            </Text>
          )}
          <View style={styles.detailedValueRow}>
            <View style={[styles.dot, { backgroundColor: COLOR_GREEN }]} />
            <Text style={[styles.detailedValue, { color: COLOR_GREEN }]}>
              Unlimited
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.compactContainer}>
        {showLabel && (
          <Text style={styles.compactLabel}>{FEATURE_LABELS[featureKey]}</Text>
        )}
        <View style={styles.compactValueRow}>
          <View style={[styles.dotSmall, { backgroundColor: COLOR_GREEN }]} />
          <Text style={[styles.compactValue, { color: COLOR_GREEN }]}>
            Unlimited
          </Text>
        </View>
      </View>
    );
  }

  const percentage =
    bucket.limit > 0 ? (bucket.current / bucket.limit) * 100 : 0;
  const color =
    percentage < 70 ? COLOR_GREEN : percentage < 90 ? COLOR_YELLOW : COLOR_RED;

  const remaining = bucket.remaining ?? bucket.limit - bucket.current;

  if (variant === "detailed") {
    return (
      <View style={styles.detailedContainer}>
        {showLabel && (
          <Text style={styles.detailedLabel}>{FEATURE_LABELS[featureKey]}</Text>
        )}
        <View style={styles.detailedValueRow}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text style={[styles.detailedValue, { color }]}>
            {bucket.current}/{bucket.limit} {PERIOD_LABELS[featureKey]}
          </Text>
        </View>
        <Text style={styles.detailedRemaining}>{remaining} remaining</Text>
      </View>
    );
  }

  return (
    <View style={styles.compactContainer}>
      {showLabel && (
        <Text style={styles.compactLabel}>{FEATURE_LABELS[featureKey]}</Text>
      )}
      <View style={styles.compactValueRow}>
        <View style={[styles.dotSmall, { backgroundColor: color }]} />
        <Text style={[styles.compactValue, { color }]}>
          {bucket.current}/{bucket.limit} {PERIOD_LABELS[featureKey]}
        </Text>
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Compact variant
  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
  },
  compactLabel: {
    fontSize: rf(11),
    color: COLOR_MUTED,
    fontWeight: "500",
  },
  compactValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
  },
  compactValue: {
    fontSize: rf(12),
    fontWeight: "600",
  },
  dotSmall: {
    width: rp(6),
    height: rp(6),
    borderRadius: rbr(3),
  },

  // Detailed variant
  detailedContainer: {
    gap: rp(2),
  },
  detailedLabel: {
    fontSize: rf(12),
    color: COLOR_MUTED,
    fontWeight: "500",
    marginBottom: rp(2),
  },
  detailedValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
  },
  detailedValue: {
    fontSize: rf(14),
    fontWeight: "700",
  },
  detailedRemaining: {
    fontSize: rf(11),
    color: COLOR_MUTED,
    fontWeight: "400",
  },
  dot: {
    width: rp(8),
    height: rp(8),
    borderRadius: rbr(4),
  },
});

export default UsageCounter;
