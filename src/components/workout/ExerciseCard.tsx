/**
 * FitAI — Exercise Card (Aurora, 2026 session redesign)
 *
 * NOTE: This file appears unused — the live workout session uses the
 * ExerciseCard in src/features/workouts/components/. Kept for alignment;
 * completed-set colors already use colors.successAlt (audit row 17).
 *
 * Flat exercise summary surface. No boxed card chrome: a typographic exercise
 * title, a plain meta line (sets × reps · weight · rest), sets rendered as
 * flat rows (completed sets read as success-tinted text + check, not badge
 * boxes), a notes section, and a plain stats line.
 *
 * All props, handlers, tap affordances (per-set TouchableOpacity with its
 * exact accessibility labels) and the start-button label logic are unchanged.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../ui/aurora';
import { flatColors as colors, spacing, typography } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';
import { rf, rp, rw, rbr } from '../../utils/responsive';

interface ExerciseCardProps {
  exerciseName: string;
  sets: number;
  reps: string;
  weight?: number;
  restTime?: number;
  notes?: string;
  completedSets: boolean[];
  isCompleted: boolean;
  setsCompleted: number;
  totalDuration: number;
  caloriesBurned: number;
  onSetComplete: (setIndex: number) => void;
  onStartExercise: () => void;
  isTimeBased: boolean;
  repsDisplay: string;
}

const safeString = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isNaN(value)) return fallback;
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

/** Format elapsed seconds as M:SS (e.g. 0:05, 1:30, 10:04) */
const formatDuration = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const META_BULLET = '  •  ';

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exerciseName,
  sets,
  reps: _reps,
  weight,
  restTime,
  notes,
  completedSets,
  isCompleted,
  setsCompleted,
  totalDuration,
  caloriesBurned,
  onSetComplete,
  onStartExercise,
  isTimeBased,
  repsDisplay,
}) => {
  const completedCount = completedSets.filter(Boolean).length || 0;

  // Meta line: "3 sets × 10 · 60kg · Rest 90s" (weight/rest only when present)
  const metaParts = [`${safeString(sets, '0')} sets × ${repsDisplay}`];
  if (safeNumber(weight, 0) > 0) metaParts.push(`${safeString(weight, '0')}kg`);
  if (safeNumber(restTime, 0) > 0) metaParts.push(`Rest ${safeString(restTime, '0')}s`);

  return (
    <View style={styles.container}>
      {/* ── Hero: exercise name + plain meta line ── */}
      <Text
        style={styles.exerciseName}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {safeString(exerciseName, 'Current Exercise')}
      </Text>
      <Text style={styles.metaLine} numberOfLines={1}>
        {metaParts.join(META_BULLET)}
      </Text>

      {/* ── Primary CTA (labels + handler unchanged) ── */}
      <AnimatedPressable
        onPress={onStartExercise}
        disabled={isCompleted}
        scaleValue={0.97}
        springConfig="snappy"
        hapticType="medium"
        style={[styles.startButton, isCompleted && styles.startButtonDone]}
        accessibilityRole="button"
        accessibilityLabel={
          isCompleted
            ? 'Exercise Complete'
            : isTimeBased
              ? `Start ${repsDisplay}`
              : 'Start Exercise'
        }
      >
        {isCompleted ? (
          <View style={styles.startButtonInner}>
            <Ionicons name="checkmark-circle" size={rf(18)} color={colors.successAlt} />
            <Text style={styles.startButtonDoneText}>Exercise Complete</Text>
          </View>
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Text style={styles.startButtonText}>
              {isTimeBased ? `Start ${repsDisplay}` : 'Start Exercise'}
            </Text>
            <Ionicons name="play" size={rf(16)} color={colors.white} />
          </LinearGradient>
        )}
      </AnimatedPressable>

      {/* ── Sets: flat rows, success-tinted text when done ── */}
      <Text style={styles.sectionEyebrow} numberOfLines={1}>
        Sets
      </Text>
      <View style={styles.setsList}>
        {completedSets.map((isSetCompleted, setIndex) => (
          <TouchableOpacity
            key={setIndex}
            style={styles.setRow}
            onPress={() => onSetComplete(setIndex)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={`Set ${setIndex + 1}${isSetCompleted ? ', completed' : ', not completed'}`}
          >
            <Text
              style={[styles.setRowIndex, isSetCompleted && styles.setRowIndexDone]}
              numberOfLines={1}
            >
              {`SET ${safeString(setIndex + 1)}`}
            </Text>
            <Text
              style={[styles.setRowMeta, isSetCompleted && styles.setRowMetaDone]}
              numberOfLines={1}
            >
              {safeNumber(weight, 0) > 0
                ? `${safeString(weight, '0')}kg × ${repsDisplay}`
                : repsDisplay}
            </Text>
            {isSetCompleted ? (
              <Ionicons name="checkmark" size={rf(16)} color={colors.successAlt} />
            ) : (
              <View style={styles.setRowPendingDot} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.setsProgressText} numberOfLines={1}>
        {safeString(completedCount)} / {safeString(completedSets.length || 0)} completed
      </Text>

      {/* ── Notes: flat typographic section ── */}
      <Text style={styles.sectionEyebrow} numberOfLines={1}>
        Notes
      </Text>
      <Text style={styles.notesText} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.85}>
        {safeString(
          notes ||
            'Focus on proper form and controlled movements. Maintain steady breathing throughout each rep.',
          'Exercise instructions not available'
        )}
      </Text>

      {/* ── Stats: plain text line ── */}
      <View style={styles.statsRow}>
        <Text style={styles.statText} numberOfLines={1}>
          {`${safeString(setsCompleted)} sets done`}
        </Text>
        <Text style={styles.statText} numberOfLines={1}>
          {formatDuration(totalDuration)}
        </Text>
        <Text style={styles.statText} numberOfLines={1}>
          {`${safeString(caloriesBurned)} kcal`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  exerciseName: {
    fontSize: rf(24),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: spacing.xs,
  },
  metaLine: {
    fontSize: rf(13),
    color: colors.textSecondary,
    fontWeight: String(typography.fontWeight.medium) as any,
    letterSpacing: 0.2,
    marginBottom: spacing.lg,
  },
  startButton: {
    borderRadius: rbr(16),
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    minHeight: Math.max(rp(52), 52),
  },
  startButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: Math.max(rp(52), 52),
    backgroundColor: colors.successTint,
  },
  startButtonText: {
    fontSize: rf(16),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.white,
    letterSpacing: 0.3,
  },
  startButtonDone: {
    // Keep the same outer radius/overflow; tint applied on inner row.
  },
  startButtonDoneText: {
    fontSize: rf(16),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.successAlt,
    letterSpacing: 0.3,
  },

  sectionEyebrow: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: spacing.sm,
  },
  setsList: {
    marginBottom: spacing.xs,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rw(12),
    minHeight: Math.max(rp(44), 44),
    paddingVertical: rp(spacing.xs),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: hexToRgba(colors.white, 0.08),
  },
  setRowIndex: {
    width: rw(48),
    fontSize: rf(13),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  setRowIndexDone: {
    color: colors.successAlt,
  },
  setRowMeta: {
    flex: 1,
    fontSize: rf(14),
    color: colors.textSecondary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  setRowMetaDone: {
    color: colors.successAlt,
  },
  setRowPendingDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
    backgroundColor: hexToRgba(colors.white, 0.25),
  },
  setsProgressText: {
    fontSize: rf(12),
    color: colors.textMuted,
    fontWeight: String(typography.fontWeight.medium) as any,
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  notesText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(20),
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: hexToRgba(colors.white, 0.08),
  },
  statText: {
    fontSize: rf(12),
    color: colors.textMuted,
    fontWeight: String(typography.fontWeight.medium) as any,
    fontVariant: ['tabular-nums'],
  },
});
