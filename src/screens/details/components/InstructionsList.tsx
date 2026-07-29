/**
 * InstructionsList — flat numbered step list for the exercise detail screen.
 *
 * Each row: small step number in a tinted circle (full radius) + step title
 * and description with generous line-height. Hairline separators between
 * rows, no boxes. The currently-playing step (driven by useStepAnimation in
 * the parent) is highlighted via the number circle + title color only.
 *
 * Props and data rendering logic are unchanged from the previous
 * implementation.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme/aurora-tokens';
import { hexToRgba } from '../../../utils/colors';
import { rf, rw, rbr, rp } from '../../../utils/responsive';

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
    <View style={styles.container}>
      <Text style={styles.eyebrow}>STEP-BY-STEP INSTRUCTIONS</Text>

      {instructions.map((instruction: ExerciseInstruction, index: number) => {
        const isActive = currentStep === index;
        const isLast = index === instructions.length - 1;
        return (
          <View key={index} style={[styles.stepRow, isLast && styles.stepRowLast]}>
            <View style={[styles.stepCircle, isActive && styles.stepCircleActive]}>
              <Text style={[styles.stepNumberText, isActive && styles.stepNumberTextActive]}>
                {instruction.step}
              </Text>
            </View>

            <View style={styles.stepBody}>
              <Text style={[styles.instructionTitle, isActive && styles.instructionTitleActive]}>
                {instruction.title}
              </Text>
              <Text style={styles.instructionDescription}>{instruction.description}</Text>

              {instruction.tips.length > 0 && (
                <View style={styles.tipsBlock}>
                  {instruction.tips.map((tip: string, tipIndex: number) => (
                    <Text key={tipIndex} style={styles.tipText}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: rp(spacing.lg),
  },
  eyebrow: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    letterSpacing: 1.2,
    marginBottom: rp(spacing.md),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: rp(spacing.md),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glass.border,
    gap: rp(spacing.md),
  },
  stepRowLast: {
    borderBottomWidth: 0,
  },
  stepCircle: {
    width: rw(28),
    height: rw(28),
    borderRadius: rbr(14),
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rp(2),
  },
  stepCircleActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  stepNumberText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: typography.fontWeight.bold,
    color: colors.primary.DEFAULT,
  },
  stepNumberTextActive: {
    color: colors.text.primary,
  },
  stepBody: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  instructionTitleActive: {
    color: colors.primary.DEFAULT,
  },
  instructionDescription: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.relaxed,
    marginTop: rp(spacing.xs),
  },
  tipsBlock: {
    marginTop: rp(spacing.sm),
    gap: rp(spacing.xxs),
  },
  tipText: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    lineHeight: rf(typography.fontSize.micro) * typography.lineHeight.relaxed,
  },
});
