import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { Exercise, WorkoutSet } from "../../../types/workout";

interface ExerciseCardDetailsProps {
  exercise: Exercise;
  workoutSet: WorkoutSet;
  formatTime: (seconds: number) => string;
  getDifficultyIcon: (difficulty: string) => string;
  getDifficultyColor: (difficulty: string) => string;
}

const getDifficultyIconName = (icon: string): keyof typeof Ionicons.glyphMap => {
  // The parent's getDifficultyIcon returns an icon name (post-fix); fall back
  // to a generic shape if it's still the legacy "ellipse" string.
  if (icon === "ellipse" || icon === "ellipse-outline") return "ellipse-outline";
  return icon as keyof typeof Ionicons.glyphMap;
};

export const ExerciseCardDetails: React.FC<ExerciseCardDetailsProps> = ({
  exercise,
  workoutSet,
  formatTime,
  getDifficultyIcon,
  getDifficultyColor,
}) => {
  return (
    <View style={styles.detailsSection}>
      <View style={styles.detailRow}>
        <Ionicons name={getDifficultyIconName(getDifficultyIcon(exercise.difficulty))} size={rf(16)} color={getDifficultyColor(exercise.difficulty)} style={styles.detailIcon} />
        <Text style={styles.detailLabel}>Difficulty:</Text>
        <Text style={styles.detailValue}>{exercise.difficulty}</Text>
      </View>

      {workoutSet.restTime && (
        <View style={styles.detailRow}>
          <Ionicons name="timer-outline" size={rf(16)} color={colors.textSecondary} style={styles.detailIcon} />
          <Text style={styles.detailLabel}>Rest time:</Text>
          <Text style={styles.detailValue}>
            {formatTime(workoutSet.restTime)}
          </Text>
        </View>
      )}

      {exercise.calories && (
        <View style={styles.detailRow}>
          <Ionicons name="flame-outline" size={rf(16)} color={colors.textSecondary} style={styles.detailIcon} />
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
