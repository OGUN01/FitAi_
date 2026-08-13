/**
 * QuickActions Component
 * Horizontal scrollable quick action buttons
 * Redesigned: Single horizontal row with scroll (per user feedback)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ProgressRing } from "../../../components/ui/aurora/ProgressRing";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rw, rh, rp } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  badge?: string | number;
  progress?: number;
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      snapToInterval={rw(72) + spacing.md}
      decelerationRate="fast"
    >
      {actions.map((action) => (
        <AnimatedPressable
          key={action.id}
          onPress={action.onPress}
          scaleValue={0.92}
          hapticFeedback={true}
          hapticType="light"
          disabled={action.disabled}
          style={
            [
              styles.actionItem,
              action.disabled && styles.actionItemDisabled,
            ].filter(Boolean) as ViewStyle[]
          }
          accessibilityLabel={action.label}
          accessibilityRole="button"
          accessibilityState={{ disabled: action.disabled }}
        >
          {/* Icon Circle with Color */}
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: hexToRgba(action.color, 0.09) },
            ]}
          >
            <Ionicons name={action.icon} size={rf(22)} color={action.color} />

            {/* Progress ring overlay — reuses the shared ProgressRing SVG
                component (same one WaterQuickRow's mini ring and
                DailyProgressRings use) instead of a hand-rolled quadrant
                border, so every "circular progress" surface in the app
                renders a true smooth arc. */}
            {action.progress !== undefined &&
              action.progress > 0 &&
              action.progress < 100 && (
                <View style={styles.progressRingWrap} pointerEvents="none">
                  <ProgressRing
                    progress={action.progress}
                    size={rw(60)}
                    strokeWidth={rw(3)}
                    color={action.color}
                    backgroundColor={hexToRgba(action.color, 0.25)}
                    showText={false}
                  />
                </View>
              )}

            {/* Completed checkmark */}
            {action.progress === 100 && (
              <View style={styles.completedBadge}>
                {/* White-on-success computes to ~2.78:1, failing the 3:1
                    icon minimum; near-black computes to ~8.6:1. */}
                <Ionicons
                  name="checkmark"
                  size={rf(10)}
                  color={colors.background}
                />
              </View>
            )}

            {/* Badge */}
            {action.badge !== undefined && (
              <View style={[styles.badge, { backgroundColor: action.color }]}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  {typeof action.badge === "number" && action.badge > 9
                    ? "9+"
                    : action.badge}
                </Text>
              </View>
            )}
          </View>

          {/* Label */}
          <Text style={styles.label} numberOfLines={1}>
            {action.label}
          </Text>
        </AnimatedPressable>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: rp(spacing.md),
    gap: spacing.md,
  },
  actionItem: {
    alignItems: "center",
    width: rw(72),
  },
  actionItemDisabled: {
    opacity: 0.4,
  },
  iconCircle: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
    position: "relative",
  },
  progressRingWrap: {
    position: "absolute",
    top: -rw(2),
    left: -rw(2),
  },
  completedBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: colors.success,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: rp(4),
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: rf(11),
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    textAlign: "center",
  },
});

export default QuickActions;
