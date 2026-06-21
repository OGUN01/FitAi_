import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rp, rbr, rs } from "../../../utils/responsive";
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
    marginBottom: spacing.sm,
  },

  exerciseNumber: {
    width: rs(32),
    height: rs(32),
    borderRadius: rbr(16),
    backgroundColor: colors.primary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: spacing.md,
  },

  exerciseNumberText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
  },

  titleSection: {
    flex: 1,
  },

  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: rp(4),
  },

  exerciseNameCompleted: {
    color: colors.success,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  metaText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  statusSection: {
    alignItems: "center" as const,
  },

  completedBadge: {
    width: rs(32),
    height: rs(32),
    borderRadius: rbr(16),
    backgroundColor: colors.success,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  completedIcon: {
    color: colors.white,
    fontSize: rf(16),
    fontWeight: "bold",
  },

  playButton: {
    width: 44,
    height: 44,
    borderRadius: rbr(22),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  playIcon: {
    fontSize: rf(14),
  },
});
