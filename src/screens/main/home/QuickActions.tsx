/**
 * QuickActions Component
 * Horizontal scrollable quick action buttons
 * Redesigned: Single horizontal row with scroll (per user feedback)
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rw, rh, rp } from "../../../utils/responsive";

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
          hapticType="medium"
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
              { backgroundColor: `${action.color}18` },
            ]}
          >
            <Ionicons name={action.icon} size={rf(22)} color={action.color} />

            {/* Progress ring overlay */}
            {action.progress !== undefined &&
              action.progress > 0 &&
              action.progress < 100 && (
                <View
                  style={[
                    styles.progressRing,
                    { borderColor: `${action.color}40` },
                  ]}
                >
                  <View
                    style={[
                      styles.progressArc,
                      {
                        borderColor: action.color,
                        borderTopColor: "transparent",
                        borderRightColor:
                          action.progress > 25 ? action.color : "transparent",
                        borderBottomColor:
                          action.progress > 50 ? action.color : "transparent",
                        borderLeftColor:
                          action.progress > 75 ? action.color : "transparent",
                      },
                    ]}
                  />
                </View>
              )}

            {/* Completed checkmark */}
            {action.progress === 100 && (
              <View style={styles.completedBadge}>
                <Ionicons
                  name="checkmark"
                  size={rf(10)}
                  color={colors.white}
                />
              </View>
            )}

            {/* Badge */}
            {action.badge !== undefined && (
              <View style={[styles.badge, { backgroundColor: action.color }]}>
                <Text style={styles.badgeText}>
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
  progressRing: {
    position: "absolute",
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: rw(30),
    borderWidth: 2,
  },
  progressArc: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: rw(30),
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
    fontSize: rf(9),
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
