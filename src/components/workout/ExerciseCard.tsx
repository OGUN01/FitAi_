import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Card, Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
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
          style={{ marginTop: ResponsiveTheme.spacing.md }}
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
    padding: ResponsiveTheme.spacing.xl,
    marginBottom: ResponsiveTheme.spacing.lg,
    width: "100%",
  },

  exerciseHeader: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  exerciseName: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  exerciseDetails: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
  },

  exerciseDetailText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  setsContainer: {
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  setsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
    textAlign: "center",
  },

  setsGrid: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  setButton: {
    width: rw(56),
    height: rw(56),
    borderRadius: rbr(28),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.border,
    position: "relative",
  },

  setButtonCompleted: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  setButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.textSecondary,
  },

  setButtonTextCompleted: {
    color: ResponsiveTheme.colors.white,
  },

  setButtonCheck: {
    position: "absolute",
    top: rp(-2),
    right: rp(2),
    fontSize: rf(12),
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  setsProgressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  instructionsContainer: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  instructionsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  instructionsText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: ResponsiveTheme.fontSize.sm * 1.5,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: ResponsiveTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textTransform: "uppercase",
  },
});
