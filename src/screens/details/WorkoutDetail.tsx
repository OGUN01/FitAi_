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
import { Button } from "../../components/ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh, rbr } from '../../utils/responsive';
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
          <ActivityIndicator size="large" color={ResponsiveTheme.colors.primary} />
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
            style={{ marginTop: ResponsiveTheme.spacing.lg }}
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
    backgroundColor: ResponsiveTheme.colors.background,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: ResponsiveTheme.spacing.md,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.xl,
  },

  emptyIcon: {
    fontSize: rf(64),
    marginBottom: ResponsiveTheme.spacing.md,
  },

  emptyTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  emptySubtitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },

  backButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  backIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.text,
  },

  headerTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  favoriteButton: {
    width: rw(40),
    height: rh(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  favoriteIcon: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.text,
  },

  scrollView: {
    flex: 1,
    paddingHorizontal: ResponsiveTheme.spacing.md,
  },

  exercisesSection: {
    marginBottom: ResponsiveTheme.spacing.xxl,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  bottomContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.background,
  },
});
