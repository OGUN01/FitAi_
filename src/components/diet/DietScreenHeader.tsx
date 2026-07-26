import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../theme/aurora-tokens";
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
      <Text
        style={styles.title}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        Nutrition Plan
      </Text>

      {/* Date navigator row */}
      <View style={styles.dateSelector}>
        <AnimatedPressable
          style={styles.dateNavButton}
          onPress={onPrevDay}
          scaleValue={0.9}
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={rf(22)} color={colors.text} />
        </AnimatedPressable>
        <GlassCard
          elevation={1}
          blurIntensity="light"
          padding="sm"
          borderRadius="lg"
          style={styles.dateBadge}
        >
          <Text
            style={styles.dateText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {dateLabel}
          </Text>
          <Text
            style={styles.dateSubtext}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {dateSubLabel}
          </Text>
        </GlassCard>
        <AnimatedPressable
          style={styles.dateNavButton}
          onPress={onNextDay}
          scaleValue={0.9}
          accessibilityRole="button"
          accessibilityLabel="Next day"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-forward" size={rf(22)} color={colors.text} />
        </AnimatedPressable>
      </View>

      {/* Action buttons row */}
      <View style={styles.headerButtons}>
        <AnimatedPressable
          style={[styles.aiButton, isGeneratingPlan ? styles.aiButtonDisabled : undefined] as StyleProp<ViewStyle>}
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
              <Ionicons name="calendar-outline" size={rf(13)} color={colors.white} />
              <Text
                style={styles.aiButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
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
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add-circle-outline" size={rf(20)} color={colors.white} />
        </AnimatedPressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: rp(10),
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: "bold",
    color: colors.text,
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
    borderRadius: borderRadius.full,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  dateBadge: {
    flex: 1,
    marginHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  dateText: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
  dateSubtext: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
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
    backgroundColor: colors.primary,
    paddingHorizontal: rp(14),
    paddingVertical: rp(8),
    borderRadius: rs(20),
    alignItems: "center",
    justifyContent: "center",
  },
  aiButtonDisabled: { backgroundColor: colors.textMuted },
  aiButtonText: {
    color: colors.white,
    fontSize: rf(12),
    fontWeight: "600",
  },
  addButton: {
    width: Math.max(rw(44), 44),
    height: Math.max(rh(44), 44),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
});
