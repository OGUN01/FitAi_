import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { THEME } from "../../ui";
import { Exercise, WorkoutSet } from "../../../types/workout";

interface ExerciseCardHeaderProps {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  exerciseNumber: number;
  isCompleted: boolean;
  onStart?: () => void;
  formatReps: (reps: number | string) => string;
  formatTime: (seconds: number) => string;
}

export const ExerciseCardHeader: React.FC<ExerciseCardHeaderProps> = ({
  exercise,
  workoutSet,
  exerciseNumber,
  isCompleted,
  onStart,
  formatReps,
  formatTime,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.exerciseNumber}>
        <Text style={styles.exerciseNumberText}>{exerciseNumber}</Text>
      </View>

      <View style={styles.titleSection}>
        <Text
          style={[
            styles.exerciseName,
            isCompleted && styles.exerciseNameCompleted,
          ]}
        >
          {exercise.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {workoutSet.sets} sets × {formatReps(workoutSet.reps)} reps
          </Text>
          {workoutSet.weight && (
            <Text style={styles.metaText}> • {workoutSet.weight}kg</Text>
          )}
          {workoutSet.duration && (
            <Text style={styles.metaText}>
              {" "}
              • {formatTime(workoutSet.duration)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.statusSection}>
        {isCompleted ? (
          <View style={styles.completedBadge}>
            <Text style={styles.completedIcon}>✓</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.playButton} onPress={onStart}>
            <Text style={styles.playIcon}>▶️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: THEME.spacing.sm,
  },

  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: THEME.spacing.md,
  },

  exerciseNumberText: {
    color: THEME.colors.white,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
  },

  titleSection: {
    flex: 1,
  },

  exerciseName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: 4,
  },

  exerciseNameCompleted: {
    color: THEME.colors.success,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  metaText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  statusSection: {
    alignItems: "center" as const,
  },

  completedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.success,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  completedIcon: {
    color: THEME.colors.white,
    fontSize: 16,
    fontWeight: "bold",
  },

  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  playIcon: {
    fontSize: 14,
  },
});
