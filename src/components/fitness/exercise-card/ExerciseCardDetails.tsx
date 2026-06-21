import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
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
    marginBottom: spacing.md,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: spacing.xs,
  },

  detailIcon: {
    fontSize: rf(16),
    marginRight: spacing.sm,
    width: rw(20),
  },

  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    minWidth: 80,
  },

  detailValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },
});
