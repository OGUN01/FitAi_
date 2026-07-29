/**
 * ExerciseInfoCard — flat exercise summary for the detail screen.
 *
 * No card chrome: bold exercise name + tinted difficulty badge, hairline-
 * bounded flat stat row (sets / reps / weight / rest), and target muscles
 * rendered as muted inline text rather than chip boxes.
 *
 * Props are unchanged from the previous implementation.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme/aurora-tokens';
import { hexToRgba } from '../../../utils/colors';
import { rf, rp } from '../../../utils/responsive';

interface ExerciseInfoCardProps {
  name: string;
  description: string;
  difficulty: string;
  sets: number;
  reps: string;
  weight?: string;
  restTime: string;
  targetMuscles: string[];
}

export const ExerciseInfoCard: React.FC<ExerciseInfoCardProps> = ({
  name,
  description,
  difficulty,
  sets,
  reps,
  weight,
  restTime,
  targetMuscles,
}) => {
  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'beginner':
        return colors.success.DEFAULT;
      case 'intermediate':
        return colors.warning.DEFAULT;
      case 'advanced':
        return colors.error.DEFAULT;
      default:
        return colors.text.secondary;
    }
  };

  const formatDifficulty = (diff: string) => {
    return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
  };

  const difficultyColor = getDifficultyColor(difficulty);

  return (
    <View style={styles.container}>
      {/* Name + difficulty */}
      <View style={styles.headerRow}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {name}
        </Text>
        <View
          style={[styles.difficultyBadge, { backgroundColor: hexToRgba(difficultyColor, 0.12) }]}
        >
          <Text style={[styles.difficultyText, { color: difficultyColor }]}>
            {formatDifficulty(difficulty)}
          </Text>
        </View>
      </View>

      {!!description && <Text style={styles.exerciseDescription}>{description}</Text>}

      {/* Flat stat row — hairline top/bottom, no boxes */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sets}</Text>
          <Text style={styles.statLabel}>SETS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reps}</Text>
          <Text style={styles.statLabel}>REPS</Text>
        </View>
        {weight ? (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{weight}</Text>
              <Text style={styles.statLabel}>WEIGHT</Text>
            </View>
          </>
        ) : null}
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{restTime}</Text>
          <Text style={styles.statLabel}>REST</Text>
        </View>
      </View>

      {/* Target muscles — muted inline text, not chips */}
      {targetMuscles.length > 0 && (
        <View style={styles.musclesBlock}>
          <Text style={styles.musclesEyebrow}>TARGET MUSCLES</Text>
          <Text style={styles.musclesText}>{targetMuscles.join('  ·  ')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: rp(spacing.lg),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: rp(spacing.sm),
  },
  exerciseName: {
    flex: 1,
    fontSize: rf(typography.fontSize.h2),
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  difficultyBadge: {
    paddingHorizontal: rp(spacing.sm),
    paddingVertical: rp(spacing.xs),
    borderRadius: rp(8),
    marginTop: rp(spacing.xxs),
  },
  difficultyText: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: typography.fontWeight.bold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  exerciseDescription: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.relaxed,
    marginTop: rp(spacing.sm),
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: rp(spacing.md),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.glass.border,
    marginTop: rp(spacing.md),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: rp(spacing.xxs),
  },
  statValue: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: rp(28),
    backgroundColor: colors.glass.border,
  },
  musclesBlock: {
    marginTop: rp(spacing.md),
    gap: rp(spacing.xxs),
  },
  musclesEyebrow: {
    fontSize: rf(typography.fontSize.micro),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    letterSpacing: 1.2,
  },
  musclesText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    lineHeight: rf(typography.fontSize.caption) * typography.lineHeight.normal,
    textTransform: 'capitalize',
  },
});
