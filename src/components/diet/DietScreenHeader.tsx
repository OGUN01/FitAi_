import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";

interface DietScreenHeaderProps {
  isGeneratingPlan: boolean;
  hasPlan?: boolean;
  onGenerateWeeklyPlan: () => void;
  handleSearchFood: () => void;
  selectedDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export const DietScreenHeader: React.FC<DietScreenHeaderProps> = React.memo(({
  isGeneratingPlan,
  hasPlan,
  onGenerateWeeklyPlan,
  handleSearchFood,
  selectedDate,
  onPrevDay,
  onNextDay,
}) => {
  const today = new Date();
  const isToday =
    selectedDate.getFullYear() === today.getFullYear() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getDate() === today.getDate();
  const dateLabel = isToday ? "Today" : selectedDate.toLocaleDateString("en-US", { weekday: "short" });
  const dateSubLabel = selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <View style={styles.header}>
      {/* Title row */}
      <Text style={styles.title}>Nutrition Plan</Text>

      {/* Date navigator row */}
      <View style={styles.dateSelector}>
        <AnimatedPressable
          style={styles.dateNavButton}
          onPress={onPrevDay}
          scaleValue={0.9}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
        >
          <Text style={styles.dateNavIcon}>‹</Text>
        </AnimatedPressable>
        <GlassCard
          elevation={1}
          blurIntensity="light"
          padding="sm"
          borderRadius="lg"
          style={styles.dateBadge}
        >
          <Text style={styles.dateText}>{dateLabel}</Text>
          <Text style={styles.dateSubtext}>{dateSubLabel}</Text>
        </GlassCard>
        <AnimatedPressable
          style={styles.dateNavButton}
          onPress={onNextDay}
          scaleValue={0.9}
          accessibilityRole="button"
          accessibilityLabel="Next day"
        >
          <Text style={styles.dateNavIcon}>›</Text>
        </AnimatedPressable>
      </View>

      {/* Action buttons row */}
      <View style={styles.headerButtons}>
        <AnimatedPressable
          style={[styles.aiButton, isGeneratingPlan ? styles.aiButtonDisabled : undefined] as any}
          onPress={onGenerateWeeklyPlan}
          disabled={isGeneratingPlan}
          scaleValue={0.95}
          accessibilityRole="button"
          accessibilityLabel={hasPlan ? "Refresh weekly plan" : "Generate weekly plan"}
        >
          {isGeneratingPlan ? (
            <AuroraSpinner size="sm" theme="white" />
          ) : (
            <View style={styles.buttonInner}>
              <Ionicons name="calendar-outline" size={rf(13)} color={ResponsiveTheme.colors.white} />
              <Text style={styles.aiButtonText}>
                {hasPlan ? "Refresh Week" : "Generate Week"}
              </Text>
            </View>
          )}
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.addButton}
          onPress={handleSearchFood}
          scaleValue={0.95}
          accessibilityRole="button"
          accessibilityLabel="Log Meal"
        >
          <Ionicons name="add-circle-outline" size={rf(20)} color={ResponsiveTheme.colors.white} />
        </AnimatedPressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.sm,
    gap: rp(10),
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
    alignSelf: "flex-start",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
  },
  dateNavButton: {
    width: Math.max(rw(44), 44),
    height: Math.max(rh(44), 44),
    borderRadius: ResponsiveTheme.borderRadius.full,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  dateNavIcon: {
    fontSize: rf(24),
    color: ResponsiveTheme.colors.text,
    fontWeight: "bold",
  },
  dateBadge: {
    flex: 1,
    marginHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    alignItems: "center",
  },
  dateText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  dateSubtext: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    gap: rp(8),
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
  },
  aiButton: {
    flex: 1,
    minHeight: 44,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(14),
    paddingVertical: rp(8),
    borderRadius: rs(20),
    alignItems: "center",
    justifyContent: "center",
  },
  aiButtonDisabled: { backgroundColor: ResponsiveTheme.colors.textMuted },
  aiButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(12),
    fontWeight: "600",
  },
  addButton: {
    width: Math.max(rw(44), 44),
    height: Math.max(rh(44), 44),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});
