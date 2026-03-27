import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/GlassCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp, rbr } from "../../utils/responsive";

interface EmptyCalendarMessageProps {
  weekCalendarData: any[];
  onPlanWorkout?: () => void;
}

export const EmptyCalendarMessage: React.FC<EmptyCalendarMessageProps> = React.memo(({
  weekCalendarData,
  onPlanWorkout,
}) => {
  if (!weekCalendarData || weekCalendarData.every((d) => !d.hasWorkout)) {
    return (
      <GlassCard
        elevation={2}
        padding="md"
        borderRadius="lg"
        style={styles.card}
      >
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="barbell-outline" size={rf(28)} color={ResponsiveTheme.colors.primary} />
          </View>
          <Text style={styles.title}>No workouts scheduled</Text>
          <Text style={styles.subtitle}>
            Plan your week to stay on track with your fitness goals
          </Text>
          {onPlanWorkout && (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={onPlanWorkout}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Plan your first workout"
            >
              <Ionicons name="calendar-outline" size={rf(16)} color={ResponsiveTheme.colors.white} />
              <Text style={styles.ctaText}>Plan Workout</Text>
            </TouchableOpacity>
          )}
        </View>
      </GlassCard>
    );
  }
  return null;
});

const styles = StyleSheet.create({
  card: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  container: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  iconContainer: {
    width: rw(52),
    height: rw(52),
    borderRadius: rbr(26),
    backgroundColor: ResponsiveTheme.colors.primaryTint,
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
    justifyContent: "center",
    gap: rp(6),
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    minHeight: 44,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  ctaText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
  },
});
