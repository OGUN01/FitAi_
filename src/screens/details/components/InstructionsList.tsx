import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../components/ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
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
    marginBottom: spacing.md,
  },
  instructionsTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  instructionItem: {
    marginBottom: spacing.lg,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  instructionItemActive: {
    backgroundColor: colors.primary + "10",
    borderColor: colors.primary + "30",
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: rw(28),
    height: rh(28),
    borderRadius: rbr(14),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  stepNumberActive: {
    backgroundColor: colors.primary,
  },
  stepNumberText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  stepNumberTextActive: {
    color: colors.white,
  },
  instructionTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  instructionTitleActive: {
    color: colors.primary,
  },
  instructionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: spacing.sm,
  },
  tipsContainer: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tipsTitle: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(18),
    marginBottom: spacing.xs / 2,
  },
});
