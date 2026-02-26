import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
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
    padding: ResponsiveTheme.spacing.md,
  },
  stepHeader: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  stepNumber: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.primary,
    fontWeight: "600",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  stepTitle: {
    fontSize: rf(20),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  stepContent: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  stepDetails: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  stepQuantity: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  stepCalories: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
  },
  stepTime: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
  },
  instructionsContainer: {
    backgroundColor: ResponsiveTheme.colors.background,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  instructionsTitle: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  instructionsText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },
  completeButton: {
    marginTop: ResponsiveTheme.spacing.sm,
  },
});
