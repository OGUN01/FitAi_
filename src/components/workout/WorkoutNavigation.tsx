/**
 * FitAI — Workout Navigation (Aurora, 2026 session redesign)
 *
 * NOTE: This file appears unused — the live workout session uses its own
 * hero + GlassButton footer. Kept for reference; no completed-set colors
 * to align (audit rows 17/25).
 *
 * Bottom thumb-zone navigation for the session: a flat text "Previous"
 * button next to one dominant gradient CTA ("Next Exercise" / "Finish
 * Workout"). Labels, disabled logic and handlers are unchanged.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../ui/aurora';
import { flatColors as colors, spacing, typography } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';
import { rf, rp, rbr } from '../../utils/responsive';

interface WorkoutNavigationProps {
  currentExercise: number;
  totalExercises: number;
  canAdvance: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export const WorkoutNavigation: React.FC<WorkoutNavigationProps> = ({
  currentExercise,
  totalExercises,
  canAdvance,
  onPrevious,
  onNext,
}) => {
  const isLast = currentExercise === totalExercises - 1;

  return (
    <View style={styles.navigationContainer}>
      <AnimatedPressable
        onPress={onPrevious}
        disabled={currentExercise === 0}
        scaleValue={0.97}
        springConfig="snappy"
        hapticType="light"
        style={[styles.previousButton, currentExercise === 0 && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Previous"
      >
        <Ionicons name="chevron-back" size={rf(16)} color={colors.textSecondary} />
        <Text style={styles.previousText}>Previous</Text>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={onNext}
        disabled={!canAdvance}
        scaleValue={0.97}
        springConfig="snappy"
        hapticType="medium"
        style={[styles.primaryButton, !canAdvance && styles.buttonDisabled]}
        accessibilityRole="button"
        accessibilityLabel={isLast ? 'Finish Workout' : 'Next Exercise'}
      >
        <LinearGradient
          colors={[colors.primary, colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.primaryGradient}
        >
          <Text style={styles.primaryText}>{isLast ? 'Finish Workout' : 'Next Exercise'}</Text>
          <Ionicons
            name={isLast ? 'checkmark-circle' : 'arrow-forward'}
            size={rf(18)}
            color={colors.white}
          />
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
};

const styles = StyleSheet.create({
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rp(spacing.lg),
    paddingVertical: rp(spacing.sm),
    gap: rp(spacing.md),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hexToRgba(colors.white, 0.08),
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xxs),
    paddingHorizontal: rp(spacing.md),
    minHeight: Math.max(rp(44), 44),
  },
  previousText: {
    fontSize: rf(14),
    fontWeight: String(typography.fontWeight.medium) as any,
    color: colors.textSecondary,
  },
  primaryButton: {
    flex: 1,
    borderRadius: rbr(16),
    overflow: 'hidden',
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    minHeight: Math.max(rp(52), 52),
  },
  primaryText: {
    fontSize: rf(16),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.white,
    letterSpacing: 0.3,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
});
