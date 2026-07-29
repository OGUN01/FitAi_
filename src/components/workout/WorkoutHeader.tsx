/**
 * FitAI — Workout Header (Aurora, 2026 session redesign)
 *
 * Compact flat top strip for the immersive mid-workout screen. No boxed
 * GlassCard chrome — a plain text row: [close] [exercise index "3 / 12"]
 * [elapsed time], with a second plain muted line carrying the workout title,
 * mesocycle week, calories and live session volume.
 *
 * All props, handlers, haptics and accessibility labels are unchanged.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../ui/aurora';
import { colors, spacing, typography } from '../../theme/aurora-tokens';
import { rf, rp, rw, rbr } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';

interface WorkoutHeaderProps {
  workoutTitle: string;
  currentExercise: number;
  totalExercises: number;
  duration: number;
  calories: number;
  onExit: () => void;
  paddingTop?: number;
  /** Live session volume in kg (derived from store). Optional. */
  sessionVolume?: number;
  /** Mesocycle week (1-4) from fitnessStore.getMesocycleWeek(). Optional. */
  mesocycleWeek?: number | null;
}

/** Format elapsed seconds as M:SS (e.g. 0:05, 1:30, 10:04) */
const formatSeconds = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

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

const BULLET = '  •  ';

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({
  workoutTitle,
  currentExercise,
  totalExercises,
  duration,
  calories,
  onExit,
  paddingTop = 12,
  sessionVolume,
  mesocycleWeek,
}) => {
  return (
    <View style={[styles.header, { paddingTop }]}>
      {/* Primary row: close · index · elapsed time */}
      <View style={styles.primaryRow}>
        <AnimatedPressable
          onPress={onExit}
          scaleValue={0.9}
          springConfig="snappy"
          hapticType="medium"
          style={styles.exitButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Exit workout"
        >
          <Ionicons name="close" size={rf(20)} color={colors.text.secondary} />
        </AnimatedPressable>

        <Text
          style={styles.indexText}
          numberOfLines={1}
          accessibilityLabel={`Exercise ${safeString(currentExercise)} of ${safeString(totalExercises)}`}
        >
          {safeString(currentExercise)}
          <Text style={styles.indexDivider}> / </Text>
          {safeString(totalExercises)}
        </Text>

        <View style={styles.timeWrap}>
          <Text style={styles.timeText} numberOfLines={1}>
            {formatSeconds(duration)}
          </Text>
        </View>
      </View>

      {/* Secondary row: plain muted meta line (title · week · cal · volume) */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText} numberOfLines={1}>
          {safeString(workoutTitle, 'Workout')}
          {mesocycleWeek != null && mesocycleWeek > 0 ? `${BULLET}WK ${mesocycleWeek}` : ''}
          {`${BULLET}${safeString(calories)} KCAL`}
          {sessionVolume != null ? `${BULLET}${Math.round(sessionVolume).toLocaleString()} KG` : ''}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: rp(spacing.lg),
    paddingBottom: rp(spacing.sm),
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: Math.max(rp(44), 44),
  },
  exitButton: {
    // Clamp to 44px minimum touch target.
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: rbr(22),
    backgroundColor: hexToRgba(colors.text.primary, 0.06),
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    flex: 1,
    textAlign: 'center',
    fontSize: rf(17),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.text.primary,
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  indexDivider: {
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
  timeWrap: {
    // Balance the 44pt close button on the left so the index stays centered.
    width: Math.max(rw(40), 44),
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: rf(15),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.secondary,
    fontVariant: ['tabular-nums'],
  },
  metaRow: {
    marginTop: rp(spacing.xxs),
    alignItems: 'center',
  },
  metaText: {
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.medium) as any,
    color: colors.text.tertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
