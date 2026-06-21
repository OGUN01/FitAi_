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
import { ResponsiveTheme } from "../../utils/constants";
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
            color={ResponsiveTheme.colors.primary}
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
              color={ResponsiveTheme.colors.warning}
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
          color={ResponsiveTheme.colors.text}
        />
        <Text style={styles.ctaText}>Enter manually</Text>
      </AnimatedPressable>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  iconWrap: {
    width: rw(36),
    height: rw(36),
    borderRadius: rbr(18),
    backgroundColor: ResponsiveTheme.colors.primaryTint,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  body: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(19),
    marginBottom: ResponsiveTheme.spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  brandChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: rbr(8),
    marginRight: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  brandName: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingVertical: rp(12),
    borderRadius: rbr(12),
  },
  ctaText: {
    fontSize: rf(15),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
});

export default UnsupportedWatchNotice;
