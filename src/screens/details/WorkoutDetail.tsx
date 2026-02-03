import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Button, THEME } from "../../components/ui";
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Loading workout...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
            onPress={onBack ?? (() => {})}
            disabled={!onBack}
            variant="primary"
            style={{ marginTop: THEME.spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Details</Text>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={toggleFavorite}
        >
          <Text style={styles.favoriteIcon}>{isFavorited ? "❤️" : "♡"}</Text>
        </TouchableOpacity>
      </View>

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

  exercisesSection: {
    marginBottom: THEME.spacing.xxl,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  bottomContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.background,
  },
});
