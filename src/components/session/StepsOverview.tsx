import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
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
      {meal.items.map((item, index) => {
        const isCurrentAndCompleted =
          index === currentStep && completedSteps[index];
        const isCurrent = index === currentStep;
        const isCompleted = completedSteps[index];

        const cardStyle = isCurrentAndCompleted
          ? [
              styles.stepOverviewCard,
              styles.currentStepOverview,
              styles.completedStepOverview,
            ]
          : isCurrent
            ? [styles.stepOverviewCard, styles.currentStepOverview]
            : isCompleted
              ? [styles.stepOverviewCard, styles.completedStepOverview]
              : styles.stepOverviewCard;

        return (
          <Card key={index} style={cardStyle as any}>
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
                  <Text style={styles.stepCompleteIcon}>✅</Text>
                ) : index === currentStep ? (
                  <Text style={styles.stepCurrentIcon}>👉</Text>
                ) : (
                  <Text style={styles.stepPendingIcon}>⏳</Text>
                )}
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  stepsOverview: {
    gap: ResponsiveTheme.spacing.sm,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  stepOverviewCard: {
    padding: ResponsiveTheme.spacing.md,
  },
  currentStepOverview: {
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 2,
  },
  completedStepOverview: {
    backgroundColor: ResponsiveTheme.colors.success + "10",
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
    backgroundColor: ResponsiveTheme.colors.primary,
    color: "white",
    textAlign: "center",
    lineHeight: rf(24),
    fontSize: rf(12),
    fontWeight: "600",
    marginRight: ResponsiveTheme.spacing.md,
  },
  stepOverviewInfo: {
    flex: 1,
  },
  stepOverviewName: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.text,
  },
  stepOverviewQuantity: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  stepOverviewRight: {
    marginLeft: ResponsiveTheme.spacing.md,
  },
  stepCompleteIcon: {
    fontSize: rf(20),
  },
  stepCurrentIcon: {
    fontSize: rf(20),
  },
  stepPendingIcon: {
    fontSize: rf(16),
  },
});
