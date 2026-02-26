import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../components/ui";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rbr } from '../../../utils/responsive';

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
    marginBottom: ResponsiveTheme.spacing.md,
  },
  instructionsTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  instructionItem: {
    marginBottom: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  instructionItemActive: {
    backgroundColor: ResponsiveTheme.colors.primary + "10",
    borderColor: ResponsiveTheme.colors.primary + "30",
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  stepNumber: {
    width: rw(28),
    height: rh(28),
    borderRadius: rbr(14),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },
  stepNumberActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  stepNumberText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.textSecondary,
  },
  stepNumberTextActive: {
    color: ResponsiveTheme.colors.white,
  },
  instructionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },
  instructionTitleActive: {
    color: ResponsiveTheme.colors.primary,
  },
  instructionDescription: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  tipsContainer: {
    backgroundColor: ResponsiveTheme.colors.surface,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  tipsTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  tipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
    marginBottom: ResponsiveTheme.spacing.xs / 2,
  },
});
