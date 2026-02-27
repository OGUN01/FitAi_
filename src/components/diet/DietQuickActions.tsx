/**
 * DietQuickActions Component
 * Horizontal scrollable quick action buttons for diet screen
 * Fixes Issue #4 - Replaces empty placeholders with actual actions
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";

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
  onLogMeal: () => void;
  onLogWater: () => void;
  onGenerateMeal: () => void;
  onViewRecipes: () => void;
  isGenerating?: boolean;
}

export const DietQuickActions: React.FC<DietQuickActionsProps> = ({
  onScanFood,
  onScanBarcode,
  onLogMeal,
  onLogWater,
  onGenerateMeal,
  onViewRecipes,
  isGenerating,
}) => {
  const actions: QuickAction[] = [
    {
      id: "scan-food",
      label: "Scan Food",
      icon: "camera-outline",
      color: ResponsiveTheme.colors.errorLight,
      onPress: onScanFood,
    },
    {
      id: "barcode",
      label: "Barcode",
      icon: "barcode-outline",
      color: ResponsiveTheme.colors.teal,
      onPress: onScanBarcode,
    },
    {
      id: "log-meal",
      label: "Log Meal",
      icon: "add-circle-outline",
      color: ResponsiveTheme.colors.success,
      onPress: onLogMeal,
    },
    {
      id: "ai-meal",
      label: "AI Meal",
      icon: "sparkles-outline",
      color: ResponsiveTheme.colors.primary,
      onPress: onGenerateMeal,
      disabled: isGenerating,
    },
    {
      id: "water",
      label: "Log Water",
      icon: "water-outline",
      color: ResponsiveTheme.colors.info,
      onPress: onLogWater,
    },
    {
      id: "recipes",
      label: "Recipes",
      icon: "book-outline",
      color: ResponsiveTheme.colors.warning,
      onPress: onViewRecipes,
    },
  ];


  return (
    <Animated.View
      style={styles.container}
    >
      <View style={styles.gridContainer}>
        {actions.map((action, index) => (
          <AnimatedPressable
            key={action.id}
            onPress={action.onPress}
            scaleValue={0.92}
            hapticFeedback={true}
            hapticType="medium"
            disabled={action.disabled}
            style={[
              styles.actionItem,
              ...(action.disabled ? [styles.actionItemDisabled] : []),
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            {/* Icon Circle */}
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${action.color}15` },
              ]}
            >
              <Ionicons name={action.icon} size={rf(22)} color={action.color} />

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
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  gridContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-evenly" as const,
    rowGap: rp(12),
  },
  actionItem: {
    alignItems: "center" as const,
    width: rw(105),
    marginBottom: rp(4),
  },
  actionItemDisabled: {
    opacity: 0.4,
  },
  iconCircle: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: rp(-4),
    right: rp(-4),
    minWidth: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: rp(4),
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.background,
  },
  badgeText: {
    fontSize: rf(9),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
  },
  label: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
});

export default DietQuickActions;
