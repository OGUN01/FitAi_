import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {exercise.name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {workoutSet.sets} sets - {formatReps(workoutSet.reps)} reps
          </Text>
          {workoutSet.weight && (
            <Text style={styles.metaText}> - {workoutSet.weight}kg</Text>
          )}
          {workoutSet.duration && (
            <Text style={styles.metaText}>
              {" "}
              - {formatTime(workoutSet.duration)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.statusSection}>
        {isCompleted ? (
          <View style={styles.completedBadge} accessibilityRole="text">
            {/* White-on-success computes to ~2.78:1, failing the 3:1 icon
                minimum; near-black computes to ~8.6:1. */}
            <Ionicons name="checkmark" size={rf(16)} color={colors.background} />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.playButton}
            onPress={onStart}
            accessibilityRole="button"
            accessibilityLabel={`Start ${exercise.name}`}
          >
            <Ionicons name="play" size={rf(14)} color={colors.textSecondary} />
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
    width: Math.max(rs(44), 44),
    height: Math.max(rs(44), 44),
    borderRadius: rbr(22),
    backgroundColor: colors.success,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  playButton: {
    width: Math.max(rs(44), 44),
    height: Math.max(rs(44), 44),
    borderRadius: rbr(22),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
});
