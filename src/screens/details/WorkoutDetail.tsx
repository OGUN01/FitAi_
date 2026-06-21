import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui";
import {
  AuroraBackground,
  AuroraSpinner,
  GlassHeader,
  EmptyState,
  AnimatedPressable,
} from "../../components/ui/aurora";
import { colors, spacing, typography } from "../../theme/aurora-tokens";
import { rp, rf } from "../../utils/responsive";
import { useWorkoutDetailLogic } from "../../hooks/useWorkoutDetailLogic";
import { WorkoutInfoCard } from "../../components/details/WorkoutInfoCard";
import { ExerciseListItem } from "../../components/details/ExerciseListItem";

interface WorkoutDetailProps {
  workoutId: string;
  onBack?: () => void;
  onStartWorkout?: () => void;
}

export const WorkoutDetail: React.FC<WorkoutDetailProps> = ({
  workoutId,
  onBack,
  onStartWorkout,
}) => {
  const { state, actions } = useWorkoutDetailLogic(workoutId);
  const {
    workout,
    isFavorited,
    isCompleted,
    completionPercentage,
    isGeneratingPlan,
  } = state;
  const { toggleFavorite, handleExerciseSelect, getDifficultyColor } = actions;

  if (isGeneratingPlan) {
    return (
      <AuroraBackground theme="space">
        <View style={styles.loadingContainer}>
          <AuroraSpinner size="lg" />
        </View>
      </AuroraBackground>
    );
  }

  if (!workout) {
    return (
      <AuroraBackground theme="space">
        <GlassHeader title="Workout Details" onBack={onBack} />
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="barbell-outline"
            title="Workout Not Found"
            subtitle="This workout may have been removed or is not available."
            ctaText={onBack ? "Go Back" : undefined}
            onCta={onBack}
          />
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space">
      <GlassHeader
        title="Workout Details"
        onBack={onBack}
        rightAction={
          <AnimatedPressable
            onPress={toggleFavorite}
            style={styles.favoriteButton}
            accessibilityRole="button"
            accessibilityLabel={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Ionicons
              name={isFavorited ? "heart" : "heart-outline"}
              size={rf(22)}
              color={isFavorited ? colors.error.DEFAULT : colors.text.secondary}
            />
          </AnimatedPressable>
        }
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <WorkoutInfoCard
          workout={workout}
          isCompleted={isCompleted}
          completionPercentage={completionPercentage}
          getDifficultyColor={getDifficultyColor}
        />

        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>
            Exercises ({workout.exercises?.length ?? 0})
          </Text>

          {workout.exercises?.map((exercise, index) => (
            <ExerciseListItem
              key={exercise.id}
              exercise={exercise}
              index={index}
              onPress={handleExerciseSelect}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        <Button
          title={
            isCompleted
              ? "View Results"
              : completionPercentage > 0
                ? "Continue Workout"
                : "Start Workout"
          }
          onPress={onStartWorkout ?? (() => {})}
          disabled={!onStartWorkout}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyWrap: {
    flex: 1,
    justifyContent: "center",
  },
  favoriteButton: {
    width: rf(40),
    height: rf(40),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: rp(spacing.md),
  },
  exercisesSection: {
    marginBottom: rp(spacing.xxl),
  },
  sectionTitle: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.primary,
    marginBottom: rp(spacing.md),
  },
  bottomContainer: {
    padding: rp(spacing.md),
    borderTopWidth: 1,
    borderTopColor: colors.glass.border,
  },
});
