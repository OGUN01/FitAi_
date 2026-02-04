import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../../../components/ui";

interface ExerciseInstruction {
  step: number;
  title: string;
  description: string;
  tips: string[];
}

interface InstructionsListProps {
  instructions: ExerciseInstruction[];
  currentStep: number;
}

export const InstructionsList: React.FC<InstructionsListProps> = ({
  instructions,
  currentStep,
}) => {
  if (instructions.length === 0) return null;

  return (
    <Card style={styles.instructionsCard}>
      <Text style={styles.instructionsTitle}>Step-by-Step Instructions</Text>

      {instructions.map((instruction: ExerciseInstruction, index: number) => (
        <View
          key={index}
          style={[
            styles.instructionItem,
            currentStep === index && styles.instructionItemActive,
          ]}
        >
          <View style={styles.instructionHeader}>
            <View
              style={[
                styles.stepNumber,
                currentStep === index && styles.stepNumberActive,
              ]}
            >
              <Text
                style={[
                  styles.stepNumberText,
                  currentStep === index && styles.stepNumberTextActive,
                ]}
              >
                {instruction.step}
              </Text>
            </View>
            <Text
              style={[
                styles.instructionTitle,
                currentStep === index && styles.instructionTitleActive,
              ]}
            >
              {instruction.title}
            </Text>
          </View>

          <Text style={styles.instructionDescription}>
            {instruction.description}
          </Text>

          {instruction.tips.length > 0 && (
            <View style={styles.tipsContainer}>
              <Text style={styles.tipsTitle}>Tips:</Text>
              {instruction.tips.map((tip: string, tipIndex: number) => (
                <Text key={tipIndex} style={styles.tipText}>
                  • {tip}
                </Text>
              ))}
            </View>
          )}
        </View>
      ))}
    </Card>
  );
};

const styles = StyleSheet.create({
  instructionsCard: {
    marginBottom: THEME.spacing.md,
  },
  instructionsTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  instructionItem: {
    marginBottom: THEME.spacing.lg,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  instructionItemActive: {
    backgroundColor: THEME.colors.primary + "10",
    borderColor: THEME.colors.primary + "30",
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: THEME.spacing.sm,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: THEME.spacing.sm,
  },
  stepNumberActive: {
    backgroundColor: THEME.colors.primary,
  },
  stepNumberText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.textSecondary,
  },
  stepNumberTextActive: {
    color: THEME.colors.white,
  },
  instructionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },
  instructionTitleActive: {
    color: THEME.colors.primary,
  },
  instructionDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginBottom: THEME.spacing.sm,
  },
  tipsContainer: {
    backgroundColor: THEME.colors.surface,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  tipsTitle: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  tipText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: THEME.spacing.xs / 2,
  },
});
