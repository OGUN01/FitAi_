/**
 * WorkoutHistoryList Component
 * Real workout history with proper swipe-to-reveal actions
 */

import React, { useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
} from "react-native";
import AnimatedRN, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, surface, border } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rw, rp, rbr } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";
import { haptics } from "../../utils/haptics";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
interface CompletedWorkout {
  id: string;
  sessionId: string;
  workoutId: string;
  title: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  completedAt: string;
  progress: number;
  workoutSnapshot: {
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
}

// Two action buttons × rw(48) width + gap spacing.xs between them. Recomputed
// reactively so it tracks rw()/spacing token changes (was hardcoded -100).
const SWIPE_THRESHOLD = -(rw(48) * 2 + spacing.xs);

const WorkoutHistoryCard: React.FC<{
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
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
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
          gestureState.dx < SWIPE_THRESHOLD / 2 ||
          (isSwipeOpen.current && gestureState.dx < 20);

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
    }),
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
    crossPlatformAlert(
      "Delete Workout",
      `Are you sure you want to delete "${workout.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    );
  }, [closeSwipe, workout.title, onDelete]);

  const getRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (workout.category?.toLowerCase()) {
      case "strength":
        return "barbell-outline";
      case "cardio":
        return "heart-outline";
      case "hiit":
        return "flash-outline";
      case "flexibility":
      case "yoga":
        return "body-outline";
      default:
        return "fitness-outline";
    }
  };

  const isCompleted = workout.progress === 100;

  return (
    <AnimatedRN.View
      entering={FadeInRight.delay(100 + index * 80).duration(300)}
      style={styles.cardWrapper}
    >
      {/* Hidden Actions (revealed on swipe) */}
      <View style={styles.actionsContainer}>
        <AnimatedPressable
          onPress={handleRepeat}
          scaleValue={0.9}
          hapticFeedback={true}
          hapticType="medium"
          style={styles.actionButton}
        >
          <View style={[styles.actionContent, styles.repeatAction]}>
            <Ionicons name="repeat" size={rf(20)} color={colors.white} />
            <Text style={styles.actionText}>Repeat</Text>
          </View>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={handleDelete}
          scaleValue={0.9}
          hapticFeedback={true}
          hapticType="medium"
          style={styles.actionButton}
        >
          <View style={[styles.actionContent, styles.deleteAction]}>
            <Ionicons name="trash-outline" size={rf(20)} color={colors.white} />
            <Text style={styles.actionText}>Delete</Text>
          </View>
        </AnimatedPressable>
      </View>

      {/* Swipeable Card */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[styles.cardContainer, { transform: [{ translateX: swipeX }] }]}
      >
        <AnimatedPressable
          onPress={onPress}
          scaleValue={0.98}
          hapticFeedback={true}
          hapticType="light"
        >
          {/* Flat surface + hairline (was GlassCard elevation 1) */}
          <View style={styles.card}>
            <View style={styles.cardContent}>
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isCompleted
                      ? hexToRgba(colors.successAlt, 0.15)
                      : hexToRgba(colors.errorLight, 0.15),
                  },
                ]}
              >
                <Ionicons
                  name={getCategoryIcon()}
                  size={rf(20)}
                  color={isCompleted ? colors.successAlt : colors.errorLight}
                />
              </View>

              {/* Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.date} numberOfLines={1}>
                  {getRelativeDate(workout.completedAt)}
                </Text>
                <Text
                  style={styles.title}
                  numberOfLines={2}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.8}
                >
                  {workout.title}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {workout.duration} min • {workout.caloriesBurned} cal
                </Text>
              </View>

              {/* Status */}
              <View style={styles.statusContainer}>
                {isCompleted ? (
                  <View style={styles.completedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={rf(18)}
                      color={colors.successAlt}
                    />
                  </View>
                ) : (
                  <View style={styles.progressBadge}>
                    <Text style={styles.progressText} numberOfLines={1}>
                      {workout.progress}%
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </AnimatedPressable>
      </Animated.View>
    </AnimatedRN.View>
  );
};

export const WorkoutHistoryList: React.FC<WorkoutHistoryListProps> = ({
  workouts,
  onRepeatWorkout,
  onDeleteWorkout,
  onViewWorkout,
}) => {
  if (workouts.length === 0) {
    return (
      <AnimatedRN.View entering={FadeInDown.delay(300).duration(400)}>
        <View style={[styles.card, styles.emptyCard]}>
          <View style={styles.emptyState}>
            <Ionicons
              name="time-outline"
              size={rf(32)}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Workout History</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first workout to see it here
            </Text>
          </View>
        </View>
      </AnimatedRN.View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Ionicons
            name="time-outline"
            size={rf(18)}
            color={colors.text}
          />
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        <Text style={styles.sectionCount}>{workouts.length} workouts</Text>
      </View>

      {/* Workout Cards */}
      {workouts.slice(0, 5).map((workout, index) => (
        <WorkoutHistoryCard
          key={workout.id}
          workout={workout}
          index={index}
          onRepeat={() => onRepeatWorkout(workout)}
          onDelete={() => onDeleteWorkout(workout)}
          onPress={() => onViewWorkout(workout)}
        />
      ))}

      {/* "See all" footer — only when the list is truncated. Opens the next
          workout's detail view as a graceful fallback (no dedicated full-list
          route exists yet). */}
      {workouts.length > 5 && (
        <AnimatedPressable
          onPress={() => onViewWorkout(workouts[5])}
          scaleValue={0.97}
          hapticFeedback={true}
          hapticType="light"
          style={styles.seeAllFooter}
          accessibilityRole="button"
          accessibilityLabel={`See all ${workouts.length} workouts`}
        >
          <Text style={styles.seeAllFooterText}>
            See all {workouts.length} workouts
          </Text>
          <Ionicons
            name="chevron-forward"
            size={rf(14)}
            color={colors.primary}
          />
        </AnimatedPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(15),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.text,
  },
  sectionCount: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  cardWrapper: {
    position: "relative",
    marginBottom: spacing.sm,
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    // Card container has zIndex/elevation 2 — without this the swipe-revealed
    // actions sit behind the card on Android.
    zIndex: 1,
    elevation: 1,
  },
  actionButton: {
    height: "100%",
  },
  actionContent: {
    width: rw(48),
    height: "100%",
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: borderRadius.md,
    gap: rp(4),
  },
  repeatAction: {
    backgroundColor: colors.successAlt,
  },
  deleteAction: {
    backgroundColor: colors.errorAlt,
  },
  actionText: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    color: colors.white,
  },
  cardContainer: {
    backgroundColor: colors.background,
    zIndex: 2,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  // Flat surface + hairline (replaces the retired GlassCard elevation 1).
  card: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: spacing.md,
  },
  emptyCard: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  iconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
  },
  date: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
  title: {
    fontSize: rf(14),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    color: colors.text,
  },
  meta: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rp(2),
    fontVariant: ["tabular-nums"],
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  completedBadge: {
    backgroundColor: hexToRgba(colors.successAlt, 0.15),
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  progressBadge: {
    backgroundColor: hexToRgba(colors.primaryLight, 0.25),
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(4),
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: rf(11),
    fontFamily: FONT_FAMILY.bold,
    fontWeight: "700",
    color: colors.accent,
    fontVariant: ["tabular-nums"],
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: rf(14),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    textAlign: "center",
  },
  seeAllFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 44,
    marginTop: spacing.xs,
  },
  seeAllFooterText: {
    fontSize: rf(12),
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    color: colors.primary,
  },
});

export default WorkoutHistoryList;
