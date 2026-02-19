import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
import { Exercise, WorkoutSet } from "../../../types/workout";

interface ExerciseCardDetailsProps {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  formatTime: (seconds: number) => string;
  getDifficultyIcon: (difficulty: string) => string;
}

export const ExerciseCardDetails: React.FC<ExerciseCardDetailsProps> = ({
  exercise,
  workoutSet,
  formatTime,
  getDifficultyIcon,
}) => {
  return (
    <View style={styles.detailsSection}>
      <View style={styles.detailRow}>
        <Text style={styles.detailIcon}>🎯</Text>
        <Text style={styles.detailLabel}>Difficulty:</Text>
        <Text style={styles.detailValue}>
          {getDifficultyIcon(exercise.difficulty)} {exercise.difficulty}
        </Text>
      </View>

      {workoutSet.restTime && (
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>⏱️</Text>
          <Text style={styles.detailLabel}>Rest time:</Text>
          <Text style={styles.detailValue}>
            {formatTime(workoutSet.restTime)}
          </Text>
        </View>
      )}

      {exercise.calories && (
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>🔥</Text>
          <Text style={styles.detailLabel}>Calories:</Text>
          <Text style={styles.detailValue}>{exercise.calories} per set</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  detailsSection: {
    marginBottom: THEME.spacing.md,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: THEME.spacing.xs,
  },

  detailIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.sm,
    width: 20,
  },

  detailLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginRight: THEME.spacing.sm,
    minWidth: 80,
  },

  detailValue: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },
});
