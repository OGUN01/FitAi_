import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { THEME } from "../ui";

interface WorkoutHeaderProps {
  workoutTitle: string;
  currentExercise: number;
  totalExercises: number;
  duration: number;
  calories: number;
  onExit: () => void;
  paddingTop?: number;
}

const safeString = (value: any, fallback: string = ""): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isNaN(value)) return fallback;
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({
  workoutTitle,
  currentExercise,
  totalExercises,
  duration,
  calories,
  onExit,
  paddingTop = 12,
}) => {
  return (
    <View style={[styles.header, { paddingTop }]}>
      <TouchableOpacity
        onPress={onExit}
        style={styles.exitButton}
        activeOpacity={0.7}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <Text style={styles.exitButtonText}>✕</Text>
      </TouchableOpacity>

      <View style={styles.headerInfo}>
        <Text style={styles.workoutTitle} numberOfLines={1}>
          {safeString(workoutTitle, "Workout")}
        </Text>
        <Text style={styles.progressText}>
          Exercise {safeString(currentExercise)} of {safeString(totalExercises)}
        </Text>
      </View>

      <View style={styles.headerRight} pointerEvents="none">
        <Text style={styles.timerText}>{safeString(duration)}m</Text>
        <Text style={styles.caloriesText}>{safeString(calories)} cal</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    elevation: 2,
  },

  exitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.error + "20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.error + "40",
  },

  exitButtonText: {
    fontSize: 18,
    color: THEME.colors.error,
    fontWeight: THEME.fontWeight.bold,
  },

  headerInfo: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: THEME.spacing.md,
  },

  workoutTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: "center",
  },

  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs,
  },

  headerRight: {
    alignItems: "flex-end",
    opacity: 0.9,
  },

  timerText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.textSecondary,
  },

  caloriesText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
});
