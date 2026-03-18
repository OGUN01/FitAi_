import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rh, rw } from "../../utils/responsive";
interface WorkoutHeaderProps {
  workoutTitle: string;
  currentExercise: number;
  totalExercises: number;
  duration: number;
  calories: number;
  onExit: () => void;
  paddingTop?: number;
}

/** Format elapsed seconds as M:SS (e.g. 0:05, 1:30, 10:04) */
const formatSeconds = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

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

      <View style={[styles.headerRight, { pointerEvents: "none" }]}>
        <Text style={styles.timerText}>{formatSeconds(duration)}</Text>
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
    elevation: 2,
  },

  exitButton: {
    width: rw(44),
    height: rw(44),
    borderRadius: rbr(22),
    backgroundColor: ResponsiveTheme.colors.error + "20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.error + "40",
  },

  exitButtonText: {
    fontSize: rf(18),
    color: ResponsiveTheme.colors.error,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  headerInfo: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: ResponsiveTheme.spacing.md,
  },

  workoutTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  headerRight: {
    alignItems: "flex-end",
    opacity: 0.9,
  },

  timerText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.textSecondary,
  },

  caloriesText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
});
