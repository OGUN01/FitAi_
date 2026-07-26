/**
 * DietQuickActions Component
 * Horizontal scrollable quick action buttons for diet screen
 * Fixes Issue #4 - Replaces empty placeholders with actual actions
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rw, rp } from "../../utils/responsive";
import { hexToRgba, TINT_ALPHA_LOW } from "../../utils/colors";

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  badge?: string | number;
  disabled?: boolean;
}

interface DietQuickActionsProps {
  onScanFood: () => void;
  onScanBarcode: () => void;
  onScanLabel: () => void;
  onLogMeal: () => void;
  onLogWater: () => void;
  onViewRecipes: () => void;
}

export const DietQuickActions: React.FC<DietQuickActionsProps> = React.memo(
  ({
    onScanFood,
    onScanBarcode,
    onScanLabel,
    onLogMeal,
    onLogWater,
    onViewRecipes,
  }) => {
    const actions: QuickAction[] = [
      {
        id: "scan-food",
        label: "Scan Food",
        icon: "camera-outline",
        color: colors.errorLight,
        onPress: onScanFood,
      },
      {
        id: "barcode",
        label: "Barcode",
        icon: "barcode-outline",
        color: colors.teal,
        onPress: onScanBarcode,
      },
      {
        id: "scan-label",
        label: "Scan Label",
        icon: "document-text-outline",
        color: colors.purple,
        onPress: onScanLabel,
      },
      {
        id: "log-meal",
        label: "Log Meal",
        icon: "restaurant-outline",
        color: colors.success,
        onPress: onLogMeal,
      },
      {
        id: "water",
        label: "Log Water",
        icon: "water-outline",
        color: colors.info,
        onPress: onLogWater,
      },
      {
        id: "recipes",
        label: "Recipes",
        icon: "book-outline",
        color: colors.warning,
        onPress: onViewRecipes,
      },
    ];

    return (
      <Animated.View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {actions.map((action) => (
            <AnimatedPressable
              key={action.id}
              onPress={action.onPress}
              scaleValue={0.92}
              hapticFeedback={true}
              hapticType="medium"
              disabled={action.disabled}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              style={[
                styles.actionItem,
                ...(action.disabled ? [styles.actionItemDisabled] : []),
              ]}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              accessibilityState={{ disabled: !!action.disabled }}
            >
              {/* Icon Circle */}
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: hexToRgba(action.color, TINT_ALPHA_LOW) },
                ]}
              >
                <Ionicons
                  name={action.icon}
                  size={rf(22)}
                  color={action.color}
                />

                {/* Badge */}
                {action.badge !== undefined && (
                  <View
                    style={[styles.badge, { backgroundColor: action.color }]}
                  >
                    <Text style={styles.badgeText}>
                      {typeof action.badge === "number" && action.badge > 9
                        ? "9+"
                        : action.badge}
                    </Text>
                  </View>
                )}
              </View>

              {/* Label */}
              <Text
                style={styles.label}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {action.label}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </Animated.View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    gap: rp(4),
  },
  actionItem: {
    alignItems: "center" as const,
    width: rw(72),
    marginBottom: rp(4),
  },
  actionItemDisabled: {
    opacity: 0.4,
  },
  // Icon circle clamped to 44px min touch target (WCAG 2.5.5).
  iconCircle: {
    width: Math.max(rw(48), 44),
    height: Math.max(rw(48), 44),
    borderRadius: Math.max(rw(24), 22),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: spacing.xs,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: rp(-4),
    right: rp(-4),
    minWidth: Math.max(rw(18), 18),
    height: Math.max(rw(18), 18),
    borderRadius: Math.max(rw(9), 9),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: rp(4),
    borderWidth: 2,
    borderColor: colors.background,
  },
  badgeText: {
    fontSize: Math.max(rf(10), 10),
    fontWeight: "700",
    color: colors.white,
  },
  label: {
    fontSize: Math.max(rf(11), 11),
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
  },
});

export default DietQuickActions;
