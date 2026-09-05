import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, border, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { rf, rw, rp, rbr } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";

interface EmptyMealsMessageProps {
  mealsLogged: number;
  onLogMeal?: () => void;
}

export const EmptyMealsMessage: React.FC<EmptyMealsMessageProps> = ({
  mealsLogged,
  onLogMeal,
}) => {
  if (mealsLogged !== 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          {/* colors.info matches DailyProgressRings' nutrition-ring color —
              the ring directly above this card on Home already establishes
              blue as the nutrition category's color; this used the generic
              brand orange instead, reading as a different category. */}
          <Ionicons
            name="restaurant-outline"
            size={rf(28)}
            color={colors.info}
          />
        </View>
        <Text style={styles.title}>No meals logged today</Text>
        <Text style={styles.subtitle}>
          Track your nutrition to hit your daily goals
        </Text>
        {onLogMeal && (
          <AnimatedPressable
            style={styles.ctaButton}
            onPress={onLogMeal}
            scaleValue={0.96}
            hapticFeedback
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Log your first meal"
          >
            <Ionicons name="add-circle-outline" size={rf(16)} color={colors.white} />
            <Text style={styles.ctaText}>Log Meal</Text>
          </AnimatedPressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  container: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    width: rw(52),
    height: rw(52),
    borderRadius: rbr(26),
    backgroundColor: hexToRgba(colors.info, 0.1),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontFamily: "Manrope_700Bold",
    color: colors.text,
    marginBottom: rp(4),
  },
  subtitle: {
    fontSize: fontSize.sm,
    fontFamily: "Manrope_400Regular",
    color: colors.textSecondary,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: spacing.md,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rp(6),
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    fontSize: fontSize.sm,
    fontFamily: "Manrope_700Bold",
    color: colors.white,
  },
});
