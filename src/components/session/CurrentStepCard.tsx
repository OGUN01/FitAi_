import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, Button } from "../ui";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf } from '../../utils/responsive';
import { DayMeal } from "../../types/ai";

interface CurrentStepCardProps {
  meal: DayMeal;
  currentStep: number;
  completedSteps: boolean[];
  onStepComplete: (stepIndex: number) => void;
}

export const CurrentStepCard: React.FC<CurrentStepCardProps> = ({
  meal,
  currentStep,
  completedSteps,
  onStepComplete,
}) => {
  const items = meal.items ?? [];
  const currentItem = items[currentStep];

  if (!currentItem) {
    return <View />;
  }

  return (
    <Card style={styles.currentStepCard} variant="elevated">
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>
          Step {currentStep + 1} of {items.length}
        </Text>
        <Text style={styles.stepTitle}>Prepare {currentItem.name}</Text>
      </View>

      <View style={styles.stepContent}>
        <View style={styles.stepDetails}>
          <Text style={styles.stepQuantity}>
            {currentItem.quantity} {currentItem.unit}
          </Text>
          <Text style={styles.stepCalories}>
            {currentItem.calories} calories
          </Text>
          <Text style={styles.stepTime}>
            ~{currentItem.preparationTime} minutes
          </Text>
        </View>

        {currentItem.instructions && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              {currentItem.instructions}
            </Text>
          </View>
        )}
      </View>

      <Button
        title="Mark Complete"
        onPress={() => onStepComplete(currentStep)}
        style={styles.completeButton}
        disabled={completedSteps[currentStep]}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  currentStepCard: {
    padding: spacing.md,
  },
  stepHeader: {
    marginBottom: spacing.md,
  },
  stepNumber: {
    fontSize: rf(14),
    color: colors.primary,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  stepTitle: {
    fontSize: rf(20),
    fontWeight: "600",
    color: colors.text,
  },
  stepContent: {
    marginBottom: spacing.md,
  },
  stepDetails: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stepQuantity: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.primary,
  },
  stepCalories: {
    fontSize: rf(14),
    color: colors.textSecondary,
  },
  stepTime: {
    fontSize: rf(14),
    color: colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  instructionsTitle: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  instructionsText: {
    fontSize: rf(14),
    color: colors.textSecondary,
    lineHeight: rf(20),
  },
  completeButton: {
    marginTop: spacing.sm,
  },
});
