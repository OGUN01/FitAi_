import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";
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
    marginBottom: ResponsiveTheme.spacing.md,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  detailIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
    width: rw(20),
  },

  detailLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginRight: ResponsiveTheme.spacing.sm,
    minWidth: 80,
  },

  detailValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
