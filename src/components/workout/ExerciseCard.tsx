import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Card, Button } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rw } from "../../utils/responsive";
interface ExerciseCardProps {
  exerciseName: string;
  sets: number;
  reps: string;
  weight?: number;
  restTime?: number;
  notes?: string;
  completedSets: boolean[];
  isCompleted: boolean;
  setsCompleted: number;
  totalDuration: number;
  caloriesBurned: number;
  onSetComplete: (setIndex: number) => void;
  onStartExercise: () => void;
  isTimeBased: boolean;
  repsDisplay: string;
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

const safeNumber = (value: any, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

/** Format elapsed seconds as M:SS (e.g. 0:05, 1:30, 10:04) */
const formatDuration = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exerciseName,
  sets,
  reps,
  weight,
  restTime,
  notes,
  completedSets,
  isCompleted,
  setsCompleted,
  totalDuration,
  caloriesBurned,
  onSetComplete,
  onStartExercise,
  isTimeBased,
  repsDisplay,
}) => {
  return (
    <Card style={styles.exerciseCard} variant="elevated">
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {safeString(exerciseName, "Current Exercise")}
        </Text>

        <Button
          title={
            isCompleted
              ? "Exercise Complete"
              : isTimeBased
                ? `Start ${repsDisplay}`
                : "Start Exercise"
          }
          onPress={onStartExercise}
          variant={isCompleted ? "outline" : "primary"}
          disabled={isCompleted}
          style={{ marginTop: spacing.md }}
        />

        <View style={styles.exerciseDetails}>
          <Text style={styles.exerciseDetailText}>
            {safeString(sets, "0")} sets x {repsDisplay}
          </Text>

          {safeNumber(weight, 0) > 0 && (
            <Text style={styles.exerciseDetailText}>
              {safeString(weight, "0")}kg
            </Text>
          )}

          {safeNumber(restTime, 0) > 0 && (
            <Text style={styles.exerciseDetailText}>
              Rest: {safeString(restTime, "0")}s
            </Text>
          )}
        </View>
      </View>

      <View style={styles.setsContainer}>
        <Text style={styles.setsTitle}>Sets Progress</Text>
        <View style={styles.setsGrid}>
          {completedSets.map((isSetCompleted, setIndex) => (
            <TouchableOpacity
              key={setIndex}
              style={[
                styles.setButton,
                isSetCompleted && styles.setButtonCompleted,
              ]}
              onPress={() => onSetComplete(setIndex)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.setButtonText,
                  isSetCompleted && styles.setButtonTextCompleted,
                ]}
              >
                {safeString(setIndex + 1)}
              </Text>
              {isSetCompleted && <Text style={styles.setButtonCheck}>OK</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.setsProgressText}>
          {safeString(completedSets.filter(Boolean).length || 0)} /{" "}
          {safeString(completedSets.length || 0)} completed
        </Text>
      </View>

      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Exercise Notes</Text>
        <Text style={styles.instructionsText}>
          {safeString(
            notes ||
              "Focus on proper form and controlled movements. Maintain steady breathing throughout each rep.",
            "Exercise instructions not available",
          )}
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{safeString(setsCompleted)}</Text>
          <Text style={styles.statLabel}>Sets Done</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(totalDuration)}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{safeString(caloriesBurned)}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  exerciseCard: {
    padding: spacing.xl,
    marginBottom: spacing.lg,
    width: "100%",
  },

  exerciseHeader: {
    marginBottom: spacing.xl,
  },

  exerciseName: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.md,
  },

  exerciseDetails: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.md,
  },

  exerciseDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },

  setsContainer: {
    marginBottom: spacing.xl,
  },

  setsTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: "center",
  },

  setsGrid: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },

  setButton: {
    width: rw(56),
    height: rw(56),
    borderRadius: rbr(28),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.border,
    position: "relative",
  },

  setButtonCompleted: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  setButtonText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textSecondary,
  },

  setButtonTextCompleted: {
    color: colors.white,
  },

  setButtonCheck: {
    position: "absolute",
    top: rp(-2),
    right: rp(2),
    fontSize: rf(12),
    color: colors.white,
    fontWeight: typography.fontWeight.bold,
  },

  setsProgressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    fontWeight: typography.fontWeight.medium,
  },

  instructionsContainer: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },

  instructionsTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  instructionsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },

  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
    textTransform: "uppercase",
  },
});
