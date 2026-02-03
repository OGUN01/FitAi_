import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../ui";
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
    gap: THEME.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  stepOverviewCard: {
    padding: THEME.spacing.md,
  },
  currentStepOverview: {
    borderColor: THEME.colors.primary,
    borderWidth: 2,
  },
  completedStepOverview: {
    backgroundColor: THEME.colors.success + "10",
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
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.primary,
    color: "white",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 12,
    fontWeight: "600",
    marginRight: THEME.spacing.md,
  },
  stepOverviewInfo: {
    flex: 1,
  },
  stepOverviewName: {
    fontSize: 14,
    fontWeight: "500",
    color: THEME.colors.text,
  },
  stepOverviewQuantity: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  stepOverviewRight: {
    marginLeft: THEME.spacing.md,
  },
  stepCompleteIcon: {
    fontSize: 20,
  },
  stepCurrentIcon: {
    fontSize: 20,
  },
  stepPendingIcon: {
    fontSize: 16,
  },
});
