/**
 * DietQuickActions Component
 * Horizontal scrollable quick action buttons for diet screen
 * Fixes Issue #4 - Replaces empty placeholders with actual actions
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
      entering={FadeIn.duration(400).delay(300)}
      style={styles.container}
    >
      <View style={styles.scrollWrapper}>
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
        </ScrollView>
        <LinearGradient
          colors={["transparent", ResponsiveTheme.colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.fadeRight}
          pointerEvents="none"
        />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  scrollWrapper: {
    position: "relative" as const,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingRight: ResponsiveTheme.spacing.xl,
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
  fadeRight: {
    position: "absolute" as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: rw(40),
    pointerEvents: "none",
  },
});

export default DietQuickActions;
