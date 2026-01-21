/**
 * DietQuickActions Component
 * Horizontal scrollable quick action buttons for diet screen
 * Fixes Issue #4 - Replaces empty placeholders with actual actions
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";

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
      color: "#FF6B6B",
      onPress: onScanFood,
    },
    {
      id: "barcode",
      label: "Barcode",
      icon: "barcode-outline",
      color: "#4ECDC4",
      onPress: onScanBarcode,
    },
    {
      id: "log-meal",
      label: "Log Meal",
      icon: "add-circle-outline",
      color: "#4CAF50",
      onPress: onLogMeal,
    },
    {
      id: "ai-meal",
      label: "AI Meal",
      icon: "sparkles-outline",
      color: "#667eea",
      onPress: onGenerateMeal,
      disabled: isGenerating,
    },
    {
      id: "water",
      label: "Log Water",
      icon: "water-outline",
      color: "#2196F3",
      onPress: onLogWater,
    },
    {
      id: "recipes",
      label: "Recipes",
      icon: "book-outline",
      color: "#FF9800",
      onPress: onViewRecipes,
    },
  ];

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(300)}
      style={styles.container}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={rw(72) + ResponsiveTheme.spacing.md}
        decelerationRate="fast"
      >
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
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },
  actionItem: {
    alignItems: "center" as const,
    width: rw(72),
  },
  actionItemDisabled: {
    opacity: 0.4,
  },
  iconCircle: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.background,
  },
  badgeText: {
    fontSize: rf(9),
    fontWeight: "700",
    color: "#fff",
  },
  label: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
});

export default DietQuickActions;
