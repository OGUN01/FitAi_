import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/GlassCard";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../theme/aurora-tokens";
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
            <Ionicons name="barbell-outline" size={rf(28)} color={colors.primary} />
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
              <Ionicons name="calendar-outline" size={rf(16)} color={colors.white} />
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
    marginBottom: spacing.sm,
  },
  container: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  iconContainer: {
    width: rw(52),
    height: rw(52),
    borderRadius: rbr(26),
    backgroundColor: colors.primaryTint,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: rp(4),
  },
  subtitle: {
    fontSize: fontSize.sm,
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
    fontWeight: "700",
    color: colors.white,
  },
});
