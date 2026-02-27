/**
 * WorkoutHistoryList Component
 * Real workout history with proper swipe-to-reveal actions
 */

import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
} from "react-native";
import AnimatedRN, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rp } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import { crossPlatformAlert } from "../../../utils/crossPlatformAlert";

interface CompletedWorkout {
  id: string;
  workoutId: string;
  title: string;
  category: string;
  duration: number;
  caloriesBurned: number;
  completedAt: string;
  progress: number;
}

interface WorkoutHistoryListProps {
  workouts: CompletedWorkout[];
  onRepeatWorkout: (workout: CompletedWorkout) => void;
  onDeleteWorkout: (workout: CompletedWorkout) => void;
  onViewWorkout: (workout: CompletedWorkout) => void;
}

const SWIPE_THRESHOLD = -100;

const WorkoutHistoryCard: React.FC<{
  workout: CompletedWorkout;
  index: number;
  onRepeat: () => void;
  onDelete: () => void;
  onPress: () => void;
}> = ({ workout, index, onRepeat, onDelete, onPress }) => {
  const swipeX = useRef(new Animated.Value(0)).current;
  const isSwipeOpen = useRef(false);

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
            <Ionicons name="repeat" size={rf(20)} color={ResponsiveTheme.colors.white} />
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
            <Ionicons name="trash-outline" size={rf(20)} color={ResponsiveTheme.colors.white} />
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
          <GlassCard
            elevation={1}
            blurIntensity="light"
            padding="md"
            borderRadius="lg"
          >
            <View style={styles.cardContent}>
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: isCompleted
                      ? `${ResponsiveTheme.colors.successAlt}25`
                      : ResponsiveTheme.colors.errorTint,
                  },
                ]}
              >
                <Ionicons
                  name={getCategoryIcon()}
                  size={rf(20)}
                  color={isCompleted ? ResponsiveTheme.colors.successAlt : ResponsiveTheme.colors.errorLight}
                />
              </View>

              {/* Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.date}>
                  {getRelativeDate(workout.completedAt)}
                </Text>
                <Text style={styles.title} numberOfLines={1}>
                  {workout.title}
                </Text>
                <Text style={styles.meta}>
                  {workout.duration || 0} min • {workout.caloriesBurned || 0} cal
                </Text>
              </View>

              {/* Status */}
              <View style={styles.statusContainer}>
                {isCompleted ? (
                  <View style={styles.completedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={rf(18)}
                      color={ResponsiveTheme.colors.success}
                    />
                  </View>
                ) : (
                  <View style={styles.progressBadge}>
                    <Text style={styles.progressText}>{workout.progress}%</Text>
                  </View>
                )}
              </View>
            </View>
          </GlassCard>
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
        <GlassCard
          elevation={1}
          blurIntensity="light"
          padding="lg"
          borderRadius="lg"
        >
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons
                name="barbell-outline"
                size={rf(36)}
                color={ResponsiveTheme.colors.primary}
              />
            </View>
            <View style={styles.emptyTextContainer}>
              <Text style={styles.emptyTitle}>No Workouts Yet</Text>
              <Text style={styles.emptySubtitle}>
                Complete your first workout to start tracking your progress. Every rep counts!
              </Text>
            </View>
            <View style={styles.emptyHint}>
              <Ionicons
                name="arrow-up-circle-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={styles.emptyHintText}>Start a workout above to begin</Text>
            </View>
          </View>
        </GlassCard>
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
            color={ResponsiveTheme.colors.text}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: ResponsiveTheme.spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  sectionCount: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  cardWrapper: {
    position: "relative",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  actionsContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  actionButton: {
    height: "100%",
  },
  actionContent: {
    width: rw(48),
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: ResponsiveTheme.borderRadius.md,
    gap: rp(4),
  },
  repeatAction: {
    backgroundColor: ResponsiveTheme.colors.successAlt,
  },
  deleteAction: {
    backgroundColor: ResponsiveTheme.colors.errorAlt,
  },
  actionText: {
    fontSize: rf(9),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
  cardContainer: {
    backgroundColor: ResponsiveTheme.colors.background,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
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
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(2),
    fontWeight: "500",
  },
  title: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  meta: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  completedBadge: {
    backgroundColor: `${ResponsiveTheme.colors.successAlt}25`,
    padding: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  progressBadge: {
    backgroundColor: ResponsiveTheme.colors.primaryTint,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: rp(4),
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  progressText: {
    fontSize: rf(11),
    fontWeight: "700",
    color: ResponsiveTheme.colors.accent,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xxl,
    gap: ResponsiveTheme.spacing.lg,
  },
  emptyIconContainer: {
    width: rw(72),
    height: rw(72),
    borderRadius: rw(36),
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.primary}30`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  emptyTextContainer: {
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  emptySubtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: rf(18),
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },
  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    marginTop: ResponsiveTheme.spacing.xs,
    backgroundColor: `${ResponsiveTheme.colors.primary}10`,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  emptyHintText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
});

export default WorkoutHistoryList;
