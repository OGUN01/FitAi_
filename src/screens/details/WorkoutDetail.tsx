import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Button, Card, THEME } from "../../components/ui";
import { useFitnessStore } from "../../stores/fitnessStore";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  duration?: string;
  restTime: string;
  instructions: string[];
  targetMuscles: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  equipment: string[];
}

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
  const { weeklyWorkoutPlan, workoutProgress, isGeneratingPlan } =
    useFitnessStore();
  const [selectedExercise, setSelectedExercise] =
    React.useState<Exercise | null>(null);

  // Find the workout from the store by ID
  const workout = React.useMemo(() => {
    if (!weeklyWorkoutPlan?.workouts) return null;

    // Search through all workouts in the weekly plan
    // DayWorkout extends Workout which has: title, category, targetMuscleGroups, estimatedCalories, difficulty
    for (const dailyWorkout of weeklyWorkoutPlan.workouts) {
      if (dailyWorkout.id === workoutId) {
        return {
          id: dailyWorkout.id,
          name: dailyWorkout.title || dailyWorkout.category || "Workout",
          description:
            dailyWorkout.description ||
            `${dailyWorkout.category} workout focusing on ${dailyWorkout.targetMuscleGroups?.join(", ") || "full body"}`,
          duration: dailyWorkout.duration
            ? `${dailyWorkout.duration} min`
            : "45-60 min",
          difficulty: dailyWorkout.difficulty || "intermediate",
          targetMuscles: dailyWorkout.targetMuscleGroups || [],
          equipment: dailyWorkout.equipment || [],
          calories: dailyWorkout.estimatedCalories || 0,
          exercises: (dailyWorkout.exercises || []).map(
            (ex: any, index: number) => ({
              id: ex.id || `ex_${index}`,
              name: ex.name || ex.exercise?.name || "Exercise",
              sets: ex.sets || 3,
              reps:
                ex.reps?.toString() || ex.repetitions?.toString() || "10-12",
              weight: ex.weight || ex.suggestedWeight,
              duration: ex.duration,
              restTime:
                ex.restTime || (ex.restSeconds ? `${ex.restSeconds}s` : "60s"),
              instructions: ex.instructions || ex.formTips || [],
              targetMuscles: ex.targetMuscles || ex.muscleGroups || [],
              difficulty: ex.difficulty || "Intermediate",
              equipment: ex.equipment || [],
            }),
          ) as Exercise[],
        };
      }
    }
    return null;
  }, [weeklyWorkoutPlan, workoutId]);

  // Get progress for this workout - WorkoutProgress has: progress (0-100), completedAt
  const progressData = workoutProgress[workoutId];
  const isCompleted = progressData?.completedAt !== undefined;
  const completionPercentage = progressData?.progress || 0;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return THEME.colors.success;
      case "Intermediate":
        return THEME.colors.warning;
      case "Advanced":
        return THEME.colors.error;
      default:
        return THEME.colors.textSecondary;
    }
  };

  // Loading state
  if (isGeneratingPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Workout not found
  if (!workout) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Details</Text>
          <View style={styles.favoriteButton} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyTitle}>Workout Not Found</Text>
          <Text style={styles.emptySubtitle}>
            This workout may have been removed or is not available.
          </Text>
          <Button
            title="Go Back"
            onPress={onBack || (() => {})}
            variant="primary"
            style={{ marginTop: THEME.spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <TouchableOpacity style={styles.favoriteButton}>
          <Text style={styles.favoriteIcon}>♡</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Workout Info Card */}
        <Card style={styles.workoutCard} variant="elevated">
          <View style={styles.workoutHeader}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutName}>{workout.name}</Text>
              <Text style={styles.workoutDescription}>
                {workout.description}
              </Text>
            </View>
            <View style={styles.workoutIcon}>
              <Text style={styles.workoutEmoji}>
                {isCompleted ? "✅" : "💪"}
              </Text>
            </View>
          </View>

          {/* Progress indicator if workout has been started */}
          {completionPercentage > 0 && !isCompleted && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${completionPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {completionPercentage}% complete
              </Text>
            </View>
          )}

          {/* Workout Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{workout.duration}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  { color: getDifficultyColor(workout.difficulty) },
                ]}
              >
                {workout.difficulty}
              </Text>
              <Text style={styles.statLabel}>Difficulty</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {workout.calories > 0 ? workout.calories : "~300"}
              </Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
          </View>

          {/* Target Muscles */}
          {workout.targetMuscles.length > 0 && (
            <View style={styles.musclesContainer}>
              <Text style={styles.musclesTitle}>Target Muscles</Text>
              <View style={styles.musclesList}>
                {workout.targetMuscles.map((muscle: string, index: number) => (
                  <View key={index} style={styles.muscleTag}>
                    <Text style={styles.muscleText}>{muscle}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Equipment */}
          {workout.equipment.length > 0 && (
            <View style={styles.equipmentContainer}>
              <Text style={styles.equipmentTitle}>Equipment Needed</Text>
              <View style={styles.equipmentList}>
                {workout.equipment.map((item, index) => (
                  <View key={index} style={styles.equipmentTag}>
                    <Text style={styles.equipmentText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Card>

        {/* Exercises List */}
        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>
            Exercises ({workout.exercises?.length ?? 0})
          </Text>

          {workout.exercises?.map((exercise, index) => (
            <Card
              key={exercise.id}
              style={styles.exerciseCard}
              onPress={() => setSelectedExercise(exercise)}
            >
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseNumber}>
                  <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseDetails}>
                    {exercise.sets} sets × {exercise.reps} reps
                    {exercise.weight && ` • ${exercise.weight}`}
                  </Text>
                  <Text style={styles.exerciseRest}>
                    Rest: {exercise.restTime}
                  </Text>
                </View>
                <TouchableOpacity style={styles.exerciseArrow}>
                  <Text style={styles.exerciseArrowText}>→</Text>
                </TouchableOpacity>
              </View>

              {/* Target Muscles for Exercise */}
              {exercise.targetMuscles.length > 0 && (
                <View style={styles.exerciseMuscles}>
                  {exercise.targetMuscles.map((muscle, muscleIndex) => (
                    <View key={muscleIndex} style={styles.exerciseMuscleTag}>
                      <Text style={styles.exerciseMuscleText}>{muscle}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Start Workout Button */}
      <View style={styles.bottomContainer}>
        <Button
          title={
            isCompleted
              ? "View Results"
              : completionPercentage > 0
                ? "Continue Workout"
                : "Start Workout"
          }
          onPress={onStartWorkout || (() => {})}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },

  emptyTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  emptySubtitle: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  headerTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  favoriteIcon: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.text,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: THEME.spacing.md,
  },

  workoutCard: {
    marginVertical: THEME.spacing.md,
  },

  workoutHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: THEME.spacing.md,
  },

  workoutInfo: {
    flex: 1,
  },

  workoutName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  workoutDescription: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },

  workoutIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: THEME.spacing.md,
  },

  workoutEmoji: {
    fontSize: 24,
  },

  progressContainer: {
    marginBottom: THEME.spacing.md,
  },

  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
    borderRadius: 4,
  },

  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    marginTop: THEME.spacing.xs,
    textAlign: "center",
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 2,
  },

  musclesContainer: {
    marginBottom: THEME.spacing.md,
  },

  musclesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  musclesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
  },

  muscleTag: {
    backgroundColor: THEME.colors.primary + "20",
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.primary + "40",
  },

  muscleText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },

  equipmentContainer: {
    marginBottom: THEME.spacing.md,
  },

  equipmentTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  equipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
  },

  equipmentTag: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
  },

  equipmentText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  exercisesSection: {
    marginBottom: THEME.spacing.xxl,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  exerciseCard: {
    marginBottom: THEME.spacing.sm,
  },

  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: THEME.spacing.sm,
  },

  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: THEME.spacing.sm,
  },

  exerciseNumberText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs / 2,
  },

  exerciseDetails: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs / 2,
  },

  exerciseRest: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },

  exerciseArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  exerciseArrowText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  exerciseMuscles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs / 2,
  },

  exerciseMuscleTag: {
    backgroundColor: THEME.colors.secondary + "20",
    paddingHorizontal: THEME.spacing.xs,
    paddingVertical: THEME.spacing.xs / 4,
    borderRadius: THEME.borderRadius.sm,
  },

  exerciseMuscleText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.secondary,
  },

  bottomContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
});
