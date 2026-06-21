/**
 * UnsupportedWatchNotice
 *
 * Explains the Android Health Connect gap for budget smartwatch brands that
 * do NOT support Health Connect (Noise, boAt, Fire-Boltt, Huawei) and offers
 * a one-tap jump into the manual health-data entry screen.
 *
 * Dropped into the WearableConnectionScreen near the bottom. Stateless:
 * caller provides onEnterManually so the same component works under the
 * settings-renderer navigation model (string-keyed screens, not a Stack).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw } from "../../utils/responsive";

export interface UnsupportedWatchNoticeProps {
  /** Navigate to the manual health-data entry screen. */
  onEnterManually: () => void;
}

// Brands commonly sold in India that do not expose Health Connect APIs, so
// their data cannot be auto-synced. Surfaced explicitly so users recognize
// their device and understand why auto-sync is unavailable.
const UNSUPPORTED_BRANDS = ["Noise", "boAt", "Fire-Boltt", "Huawei"];

export const UnsupportedWatchNotice: React.FC<UnsupportedWatchNoticeProps> = ({
  onEnterManually,
}) => {
  return (
    <GlassCard elevation={1} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="hand-left-outline"
            size={rf(20)}
            color={colors.primary}
          />
        </View>
        <Text style={styles.title}>No Health Connect watch?</Text>
      </View>

      <Text style={styles.body}>
        Your watch doesn't support automatic Health Connect sync? Log data
        manually. Common brands that don't sync:
      </Text>

      <View style={styles.brandRow}>
        {UNSUPPORTED_BRANDS.map((brand) => (
          <View key={brand} style={styles.brandChip}>
            <Ionicons
              name="close-circle"
              size={rf(12)}
              color={colors.warning}
            />
            <Text style={styles.brandName}>{brand}</Text>
          </View>
        ))}
      </View>

      <AnimatedPressable
        onPress={onEnterManually}
        style={styles.cta}
        scaleValue={0.97}
        accessibilityRole="button"
        accessibilityLabel="Enter health data manually"
        accessibilityHint="Opens the manual health-data entry screen"
      >
        <Ionicons
          name="create-outline"
          size={rf(16)}
          color={colors.text}
        />
        <Text style={styles.ctaText}>Enter manually</Text>
      </AnimatedPressable>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: rw(36),
    height: rw(36),
    borderRadius: rbr(18),
    backgroundColor: colors.primaryTint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
  },
  body: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(19),
    marginBottom: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.md,
  },
  brandChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glassSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: rbr(8),
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  brandName: {
    fontSize: rf(12),
    color: colors.text,
    marginLeft: spacing.xs,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: rp(12),
    borderRadius: rbr(12),
  },
  ctaText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.xs,
  },
});

export default UnsupportedWatchNotice;
