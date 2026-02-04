import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Card, Button, THEME } from "../ui";

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
              ? "✅ Exercise Complete"
              : isTimeBased
                ? `Start ${repsDisplay}`
                : "Start Exercise"
          }
          onPress={onStartExercise}
          variant={isCompleted ? "outline" : "primary"}
          disabled={isCompleted}
          style={{ marginTop: THEME.spacing.md }}
        />

        <View style={styles.exerciseDetails}>
          <Text style={styles.exerciseDetailText}>
            {safeString(sets, "0")} sets × {repsDisplay}
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
              {isSetCompleted && <Text style={styles.setButtonCheck}>✓</Text>}
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
          <Text style={styles.statValue}>{safeString(totalDuration)}m</Text>
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
    padding: THEME.spacing.xl,
    marginBottom: THEME.spacing.lg,
    width: "100%",
  },

  exerciseHeader: {
    marginBottom: THEME.spacing.xl,
  },

  exerciseName: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: "center",
    marginBottom: THEME.spacing.md,
  },

  exerciseDetails: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: THEME.spacing.md,
  },

  exerciseDetailText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
  },

  setsContainer: {
    marginBottom: THEME.spacing.xl,
  },

  setsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
    textAlign: "center",
  },

  setsGrid: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },

  setButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: THEME.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: THEME.colors.border,
    position: "relative",
  },

  setButtonCompleted: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },

  setButtonText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.textSecondary,
  },

  setButtonTextCompleted: {
    color: THEME.colors.white,
  },

  setButtonCheck: {
    position: "absolute",
    top: -2,
    right: 2,
    fontSize: 12,
    color: THEME.colors.white,
    fontWeight: THEME.fontWeight.bold,
  },

  setsProgressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    fontWeight: THEME.fontWeight.medium,
  },

  instructionsContainer: {
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.lg,
  },

  instructionsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  instructionsText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: THEME.fontSize.sm * 1.5,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: THEME.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
    textTransform: "uppercase",
  },
});
