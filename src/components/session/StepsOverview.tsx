import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw, rh } from '../../utils/responsive';
import { DayMeal } from "../../types/ai";

interface StepsOverviewProps {
  meal: DayMeal;
  currentStep: number;
  completedSteps: boolean[];
}

export const StepsOverview: React.FC<StepsOverviewProps> = ({
  meal,
  currentStep,
  completedSteps,
}) => {
  return (
    <View style={styles.stepsOverview}>
      <Text style={styles.sectionTitle}>All Ingredients</Text>
      {(meal.items ?? []).map((item, index) => {
        const isCurrentAndCompleted =
          index === currentStep && completedSteps[index];
        const isCurrent = index === currentStep;
        const isCompleted = completedSteps[index];

        const overlayStyle = isCurrentAndCompleted
          ? [styles.currentStepOverview, styles.completedStepOverview]
          : isCurrent
            ? [styles.currentStepOverview]
            : isCompleted
              ? [styles.completedStepOverview]
              : [];

        return (
          <GlassCard
            key={index}
            padding="none"
            contentStyle={styles.stepOverviewCard}
            style={StyleSheet.flatten(overlayStyle)}
          >
            <View style={styles.stepOverviewContent}>
              <View style={styles.stepOverviewLeft}>
                <Text style={styles.stepOverviewNumber}>{index + 1}</Text>
                <View style={styles.stepOverviewInfo}>
                  <Text style={styles.stepOverviewName}>{item.name}</Text>
                  <Text style={styles.stepOverviewQuantity}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              </View>
              <View style={styles.stepOverviewRight}>
                {completedSteps[index] ? (
                  <Ionicons name="checkmark-circle" size={rf(20)} color={colors.success} />
                ) : index === currentStep ? (
                  <Ionicons name="play" size={rf(20)} color={colors.primary} />
                ) : (
                  <Ionicons name="time-outline" size={rf(16)} color={colors.textSecondary} />
                )}
              </View>
            </View>
          </GlassCard>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  stepsOverview: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  stepOverviewCard: {
    padding: spacing.md,
  },
  currentStepOverview: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  completedStepOverview: {
    backgroundColor: colors.success + "10",
  },
  stepOverviewContent: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  stepOverviewLeft: {
    flexDirection: "row",
    alignItems: "center" as const,
    flex: 1,
  },
  stepOverviewNumber: {
    width: rw(24),
    height: rh(24),
    borderRadius: rbr(12),
    backgroundColor: colors.primary,
    color: "white",
    textAlign: "center",
    lineHeight: rf(24),
    fontSize: rf(12),
    fontWeight: "600",
    marginRight: spacing.md,
  },
  stepOverviewInfo: {
    flex: 1,
    minWidth: 0,
  },
  stepOverviewName: {
    fontSize: rf(14),
    fontWeight: "500",
    color: colors.text,
  },
  stepOverviewQuantity: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  stepOverviewRight: {
    marginLeft: spacing.md,
  },
});
