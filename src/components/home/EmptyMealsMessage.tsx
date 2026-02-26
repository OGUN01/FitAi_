import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp, rbr } from "../../utils/responsive";

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
    <GlassCard elevation={2} padding="md" borderRadius="lg" style={styles.card}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons
            name="restaurant-outline"
            size={rf(28)}
            color={ResponsiveTheme.colors.primary}
          />
        </View>
        <Text style={styles.title}>No meals logged today</Text>
        <Text style={styles.subtitle}>
          Track your nutrition to hit your daily goals
        </Text>
        {onLogMeal && (
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onLogMeal}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={rf(16)} color={ResponsiveTheme.colors.white} />
            <Text style={styles.ctaText}>Log Meal</Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
  container: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  iconContainer: {
    width: rw(52),
    height: rw(52),
    borderRadius: rbr(26),
    backgroundColor: `${ResponsiveTheme.colors.primary}18`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: rp(4),
  },
  subtitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    opacity: 0.8,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  ctaText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
  },
});
