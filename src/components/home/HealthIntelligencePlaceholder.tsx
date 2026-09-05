import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, border } from "../../theme/aurora-tokens";
import { rf, rw } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";

interface HealthIntelligencePlaceholderProps {
  onPress?: () => void;
  // 'not-connected': Health Connect/HealthKit was never authorized.
  // 'no-data': already connected, but no sleep/heart-rate/activity data has
  // come through yet — usually because the phone alone doesn't produce it;
  // it needs a smartwatch's companion app (Galaxy Wearable, Mi Fit, etc.)
  // writing into Health Connect for FitAI to read.
  variant?: 'not-connected' | 'no-data';
}

const COPY = {
  'not-connected': {
    title: 'Connect Health Data',
    subtitle:
      'Sync Apple Health or Health Connect to unlock recovery, sleep, and heart-rate insights.',
  },
  'no-data': {
    title: 'No Recovery Data Yet',
    subtitle:
      "Health Connect is synced, but recovery needs sleep or heart-rate data. Pair a smartwatch via its companion app (Galaxy Wearable, Mi Fit, etc.) — FitAI reads it from Health Connect automatically.",
  },
} as const;

export const HealthIntelligencePlaceholder: React.FC<
  HealthIntelligencePlaceholderProps
> = ({ onPress, variant = 'not-connected' }) => {
  const { title, subtitle } = COPY[variant];
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
      accessibilityRole="button"
      accessibilityLabel="Health Intelligence"
    >
      <View style={styles.card}>
        {/* Header — shares one shell with the populated HealthIntelligenceHub
            header: no status badge on the right (matches the populated card's
            own header, which deliberately omits it — see its inline comment). */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="pulse"
              size={rf(16)}
              color={colors.primary}
            />
            <Text style={styles.headerTitle}>Health Intelligence</Text>
          </View>
        </View>

        {/* Placeholder Content */}
        <View style={styles.placeholderContent}>
          <View style={styles.placeholderIconContainer}>
            <Ionicons
              name="fitness-outline"
              size={rf(28)}
              color={colors.primary}
            />
          </View>
          <View style={styles.placeholderTextBlock}>
            <Text style={styles.placeholderTitle}>{title}</Text>
            <Text style={styles.placeholderSubtitle}>{subtitle}</Text>
          </View>
          {onPress ? (
            <Ionicons
              name="chevron-forward"
              size={rf(18)}
              color={colors.textMuted}
            />
          ) : null}
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: rf(14),
    fontFamily: "Manrope_700Bold",
    color: colors.text,
    letterSpacing: 0.3,
  },
  placeholderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  placeholderIconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: hexToRgba(colors.primary, 0.09),
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  placeholderTextBlock: {
    flex: 1,
  },
  placeholderTitle: {
    fontSize: rf(14),
    fontFamily: "Manrope_700Bold",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  placeholderSubtitle: {
    fontSize: rf(12),
    fontFamily: "Manrope_400Regular",
    color: colors.text,
    lineHeight: rf(18),
    opacity: 0.65,
  },
});
