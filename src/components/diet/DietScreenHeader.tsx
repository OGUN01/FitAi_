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
  isGeneratingMeal: boolean;
  onGenerateWeeklyPlan: () => void;
  onGenerateDailyPlan: () => void;
  handleSearchFood: () => void;
  trackBStatus: { isConnected: boolean };
  selectedDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export const DietScreenHeader: React.FC<DietScreenHeaderProps> = ({
  isGeneratingPlan,
  isGeneratingMeal,
  onGenerateWeeklyPlan,
  onGenerateDailyPlan,
  handleSearchFood,
  trackBStatus,
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
      <Text style={styles.title}>Nutrition Plan</Text>
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
      <View style={styles.headerButtons}>
        <View
          style={styles.statusButton}
          accessibilityRole="none"
          accessibilityLabel={
            trackBStatus.isConnected ? "Tracker connected" : "Tracker disconnected"
          }
        >
          <Text style={styles.statusTitle}>Tracker</Text>
          <View style={styles.statusIndicatorRow}>
            <Ionicons
              name={
                trackBStatus.isConnected ? "ellipse" : "ellipse-outline"
              }
              size={rf(8)}
              color={trackBStatus.isConnected ? ResponsiveTheme.colors.successAlt : ResponsiveTheme.colors.errorAlt}
            />
            <Text style={[styles.statusLabel, { color: trackBStatus.isConnected ? ResponsiveTheme.colors.successAlt : ResponsiveTheme.colors.errorAlt }]}>
              {trackBStatus.isConnected ? "On" : "Off"}
            </Text>
          </View>
        </View>
        <AnimatedPressable
          style={
            [
              styles.aiButton,
              styles.aiButtonSecondary,
              isGeneratingPlan ? styles.aiButtonDisabled : undefined,
            ] as any
          }
          onPress={onGenerateWeeklyPlan}
          disabled={isGeneratingPlan}
          scaleValue={0.95}
          accessibilityRole="button"
          accessibilityLabel="Generate weekly plan"
        >
          {isGeneratingPlan ? (
            <AuroraSpinner size="sm" theme="white" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="calendar-outline"
                size={rf(12)}
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={[styles.aiButtonText, styles.aiButtonTextSecondary, { marginLeft: 4 }]}>Week</Text>
            </View>
          )}
        </AnimatedPressable>
        <AnimatedPressable
          style={
            [
              styles.aiButton,
              isGeneratingMeal ? styles.aiButtonDisabled : undefined,
            ] as any
          }
          onPress={onGenerateDailyPlan}
          disabled={isGeneratingMeal}
          scaleValue={0.95}
          accessibilityRole="button"
          accessibilityLabel="Generate daily plan"
        >
          {isGeneratingMeal ? (
            <AuroraSpinner size="sm" theme="white" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons
                name="today-outline"
                size={rf(12)}
                color={ResponsiveTheme.colors.white}
              />
              <Text style={[styles.aiButtonText, { marginLeft: 4 }]}>Day</Text>
            </View>
          )}
        </AnimatedPressable>
        <AnimatedPressable
          style={styles.addButton}
          onPress={handleSearchFood}
          scaleValue={0.95}
          accessibilityRole="button"
          accessibilityLabel="Add food"
        >
          <Ionicons
            name="add-circle-outline"
            size={rf(20)}
            color={ResponsiveTheme.colors.white}
          />
        </AnimatedPressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
  },
  headerButtons: { flexDirection: "row", alignItems: "center", gap: rp(12) },
  aiButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(10),
    paddingVertical: rp(7),
    borderRadius: rs(20),
    minWidth: rw(58),
    alignItems: "center",
  },
  aiButtonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary,
  },
  aiButtonDisabled: { backgroundColor: ResponsiveTheme.colors.textMuted },
  aiButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(11),
    fontWeight: "600",
  },
  aiButtonTextSecondary: {
    color: ResponsiveTheme.colors.primary,
  },
  addButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.md,
  },
  dateNavButton: {
    width: rw(40),
    height: rh(40),
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
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
  statusButton: {
    minWidth: rw(52),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
  },
  statusTitle: {
    fontSize: rf(8),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: rp(1),
  },
  statusIndicatorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: rp(3),
  },
  statusLabel: {
    fontSize: rf(9),
    fontWeight: "700",
  },
});
