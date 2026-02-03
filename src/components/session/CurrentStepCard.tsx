import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, Button, THEME } from "../ui";
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
  const currentItem = meal.items[currentStep];

  return (
    <Card style={styles.currentStepCard} variant="elevated">
      <View style={styles.stepHeader}>
        <Text style={styles.stepNumber}>
          Step {currentStep + 1} of {meal.items.length}
        </Text>
        <Text style={styles.stepTitle}>Prepare {currentItem?.name}</Text>
      </View>

      <View style={styles.stepContent}>
        <View style={styles.stepDetails}>
          <Text style={styles.stepQuantity}>
            {currentItem?.quantity} {currentItem?.unit}
          </Text>
          <Text style={styles.stepCalories}>
            {currentItem?.calories} calories
          </Text>
          <Text style={styles.stepTime}>
            ~{currentItem?.preparationTime} minutes
          </Text>
        </View>

        {currentItem?.instructions && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              {currentItem?.instructions}
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
    padding: THEME.spacing.md,
  },
  stepHeader: {
    marginBottom: THEME.spacing.md,
  },
  stepNumber: {
    fontSize: 14,
    color: THEME.colors.primary,
    fontWeight: "600",
    marginBottom: THEME.spacing.xs,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: THEME.colors.text,
  },
  stepContent: {
    marginBottom: THEME.spacing.md,
  },
  stepDetails: {
    flexDirection: "row",
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  stepQuantity: {
    fontSize: 16,
    fontWeight: "600",
    color: THEME.colors.primary,
  },
  stepCalories: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  stepTime: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  instructionsText: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },
  completeButton: {
    marginTop: THEME.spacing.sm,
  },
});
