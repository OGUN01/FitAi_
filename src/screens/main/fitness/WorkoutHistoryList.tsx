/**
 * WorkoutHistoryList Component
 * Flat grouped-list workout history (no card chrome) with:
 *  - Uppercase muted "HISTORY" section label + count
 *  - Full-width flat rows: tinted category icon square, title, muted meta
 *    (date • duration • kcal), completion status, inline Repeat affordance
 *  - Swipe-to-reveal Delete with the existing confirmation alert (unchanged)
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import AnimatedRN, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing, borderRadius } from '../../../theme/aurora-tokens';
import { rf, rw, rp, rbr } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';
import { haptics } from '../../../utils/haptics';
import { crossPlatformAlert } from '../../../utils/crossPlatformAlert';

interface CompletedWorkout {
  id: string;
  sessionId?: string;
  workoutId: string;
  title: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  completedAt: string;
  progress: number;
  workoutSnapshot?: {
    title: string;
    category: string;
    duration: number;
    exercises: Array<{
      name: string;
      sets: number;
      reps: number | string;
      exerciseId?: string;
      duration?: number;
      restTime?: number;
    }>;
  };
}

interface WorkoutHistoryListProps {
  workouts: CompletedWorkout[];
  onRepeatWorkout: (workout: CompletedWorkout) => void;
  onDeleteWorkout: (workout: CompletedWorkout) => void;
  onViewWorkout: (workout: CompletedWorkout) => void;
  /** "See all N workouts" footer — opens the full history screen. Falls back
   *  to the most-recent workout's detail if not provided. (audit #3) */
  onSeeAll?: () => void;
}

// Single swipe-revealed action (Delete) × rw(48) width. Repeat moved inline
// onto the row, so the swipe now reveals only Delete — the delete interaction
// pattern (swipe + confirmation alert) is unchanged. Recomputed reactively so
// it tracks rw() token changes (was hardcoded -100).
const SWIPE_THRESHOLD = -rw(48);

const WorkoutHistoryRow: React.FC<{
  workout: CompletedWorkout;
  index: number;
  onRepeat: () => void;
  onDelete: () => void;
  onPress: () => void;
}> = ({ workout, index, onRepeat, onDelete, onPress }) => {
  const swipeX = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

  // Recreate the PanResponder when the workout identity changes — the previous
  // implementation captured the initial `workout` in a useRef closure with
  // empty deps, so swipe state leaked across reused list rows.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0 || isSwipeOpen.current) {
          const newValue = isSwipeOpen.current
            ? SWIPE_THRESHOLD + gestureState.dx
            : gestureState.dx;
          swipeX.setValue(Math.max(SWIPE_THRESHOLD, Math.min(0, newValue)));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldOpen =
          gestureState.dx < SWIPE_THRESHOLD / 2 || (isSwipeOpen.current && gestureState.dx < 20);

        if (shouldOpen) {
          Animated.spring(swipeX, {
            toValue: SWIPE_THRESHOLD,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          isSwipeOpen.current = true;
          haptics.light();
        } else {
          Animated.spring(swipeX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 10,
          }).start();
          isSwipeOpen.current = false;
        }
      },
    })
  ).current;

  // Reset swipe state when the underlying workout changes (list reuse).
  useEffect(() => {
    swipeX.setValue(0);
    isSwipeOpen.current = false;
  }, [workout.id, swipeX]);

  const closeSwipe = useCallback(() => {
    Animated.spring(swipeX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();
    isSwipeOpen.current = false;
  }, [swipeX]);

  const handleRepeat = useCallback(() => {
    haptics.medium();
    closeSwipe();
    onRepeat();
  }, [closeSwipe, onRepeat]);

  const handleDelete = useCallback(() => {
    haptics.medium();
    closeSwipe();
    crossPlatformAlert('Delete Workout', `Are you sure you want to delete "${workout.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }, [closeSwipe, workout.title, onDelete]);

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (workout.category?.toLowerCase()) {
      case 'strength':
        return 'barbell-outline';
      case 'cardio':
        return 'heart-outline';
      case 'hiit':
        return 'flash-outline';
      case 'flexibility':
      case 'yoga':
        return 'body-outline';
      default:
        return 'fitness-outline';
    }
  };

  // Category tint map — teal for strength, coral for cardio, pink for HIIT,
  // orange for flexibility. Falls back to primary.
  const getCategoryTint = (): string => {
    switch (workout.category?.toLowerCase()) {
      case 'strength':
        return colors.teal;
      case 'cardio':
        return colors.errorLight;
      case 'hiit':
        return colors.pink;
      case 'flexibility':
      case 'yoga':
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  const isCompleted = workout.progress === 100;
  const categoryTint = getCategoryTint();

  return (
    <AnimatedRN.View
      entering={FadeInRight.delay(100 + index * 80).duration(300)}
      style={styles.rowWrapper}
    >
      {/* Hidden Delete action (revealed on swipe) */}
      <View style={styles.actionsContainer}>
        <AnimatedPressable
          onPress={handleDelete}
          scaleValue={0.9}
          hapticFeedback={true}
          hapticType="medium"
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${workout.title}`}
        >
          <View style={[styles.actionContent, styles.deleteAction]}>
            <Ionicons name="trash-outline" size={rf(20)} color={colors.white} />
            <Text style={styles.actionText}>Delete</Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Swipeable flat row — row content + hairline translate together */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.rowSlider, { transform: [{ translateX: swipeX }] }]}
      >
        <View style={styles.row}>
          {/* Main tap target (view workout) — sibling of the repeat button,
              NOT a parent, so web never renders <button> inside <button>. */}
          <AnimatedPressable
            onPress={onPress}
            scaleValue={0.98}
            hapticFeedback={true}
            hapticType="light"
            style={styles.rowMain}
          >
            {/* Category icon square — tinted by category */}
            <View style={[styles.iconSquare, { backgroundColor: hexToRgba(categoryTint, 0.15) }]}>
              <Ionicons name={getCategoryIcon()} size={rf(18)} color={categoryTint} />
            </View>

            {/* Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {workout.title}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {getRelativeDate(workout.completedAt)} • {workout.duration || 0} min •{' '}
                {workout.caloriesBurned || 0} kcal
              </Text>
            </View>

            {/* Completion status — flat check when complete, % otherwise */}
            {isCompleted ? (
              <Ionicons
                name="checkmark-circle"
                size={rf(18)}
                color={colors.successAlt}
                style={styles.statusIcon}
              />
            ) : (
              <Text style={styles.progressText} numberOfLines={1}>
                {workout.progress}%
              </Text>
            )}
          </AnimatedPressable>

          {/* Inline Repeat affordance (min 40pt touch target) */}
          <AnimatedPressable
            onPress={handleRepeat}
            scaleValue={0.9}
            hapticFeedback={true}
            hapticType="medium"
            style={styles.repeatButton}
            accessibilityRole="button"
            accessibilityLabel={`Repeat ${workout.title}`}
          >
            <Ionicons name="repeat" size={rf(18)} color={colors.primary} />
          </AnimatedPressable>
        </View>

        {/* Hairline separator — leading-inset to align with the row text */}
        <View style={styles.separator} />
      </Animated.View>
    </AnimatedRN.View>
  );
};

export const WorkoutHistoryList: React.FC<WorkoutHistoryListProps> = ({
  workouts,
  onRepeatWorkout,
  onDeleteWorkout,
  onViewWorkout,
  onSeeAll,
}) => {
  if (workouts.length === 0) {
    return (
      <AnimatedRN.View entering={FadeInDown.delay(300).duration(400)}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>HISTORY</Text>
        </View>
        {/* Empty state: simple muted centered text, no box */}
        <View style={styles.emptyState}>
          <Ionicons name="barbell-outline" size={rf(28)} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Workouts Yet</Text>
          <Text style={styles.emptySubtitle}>
            Complete your first workout to start tracking your progress. Every rep counts!
          </Text>
        </View>
      </AnimatedRN.View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          HISTORY
        </Text>
        <Text style={styles.sectionCount} numberOfLines={1}>
          {workouts.length} workouts
        </Text>
      </View>

      {/* Flat workout rows */}
      {workouts.slice(0, 5).map((workout, index) => (
        <WorkoutHistoryRow
          key={workout.id}
          workout={workout}
          index={index}
          onRepeat={() => onRepeatWorkout(workout)}
          onDelete={() => onDeleteWorkout(workout)}
          onPress={() => onViewWorkout(workout)}
        />
      ))}

      {/* "See all" footer — only when the list is truncated. Opens the full
          workout history screen (audit #3 — previously opened an Alert for a
          single arbitrary workout). */}
      {workouts.length > 5 && (
        <AnimatedPressable
          onPress={() => (onSeeAll ? onSeeAll() : onViewWorkout(workouts[5]))}
          scaleValue={0.97}
          hapticFeedback={true}
          hapticType="light"
          style={styles.seeAllFooter}
          accessibilityRole="button"
          accessibilityLabel={`See all ${workouts.length} workouts`}
        >
          <Text style={styles.seeAllFooterText}>See all {workouts.length} workouts</Text>
          <Ionicons name="chevron-forward" size={rf(14)} color={colors.primary} />
        </AnimatedPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.textTertiary,
    letterSpacing: 1.2,
  },
  sectionCount: {
    fontSize: rf(12),
    fontWeight: '500',
    color: colors.textTertiary,
  },
  rowWrapper: {
    position: 'relative',
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    // Row slider has zIndex/elevation 2 — without this the swipe-revealed
    // action sits behind the row on Android.
    zIndex: 1,
    elevation: 1,
  },
  actionButton: {
    height: '100%',
  },
  actionContent: {
    width: rw(48),
    height: '100%',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    gap: rp(4),
  },
  deleteAction: {
    backgroundColor: colors.errorAlt,
  },
  actionText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: colors.white,
  },
  rowSlider: {
    backgroundColor: colors.background,
    zIndex: 2,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: rp(spacing.sm),
  },
  iconSquare: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: rf(15),
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  statusIcon: {
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  progressText: {
    fontSize: rf(12),
    fontWeight: '700',
    color: colors.primary,
    flexShrink: 0,
    marginLeft: spacing.sm,
  },
  repeatButton: {
    width: Math.max(rw(40), 44),
    height: Math.max(rw(40), 44),
    borderRadius: rbr(20),
    backgroundColor: hexToRgba(colors.text, 0.06),
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginLeft: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: hexToRgba(colors.text, 0.06),
    marginLeft: rw(40) + spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: rf(18),
    paddingHorizontal: spacing.md,
  },
  seeAllFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 44,
    marginTop: spacing.xs,
  },
  seeAllFooterText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: colors.primary,
  },
});

export default WorkoutHistoryList;
