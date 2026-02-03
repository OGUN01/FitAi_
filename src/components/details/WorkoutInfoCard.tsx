import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../ui";

interface WorkoutInfoCardProps {
  workout: {
    name: string;
    description: string;
    duration: string;
    difficulty: string;
    targetMuscles: string[];
    equipment: string[];
    calories: number;
  };
  isCompleted: boolean;
  completionPercentage: number;
  getDifficultyColor: (difficulty: string) => string;
}

export const WorkoutInfoCard: React.FC<WorkoutInfoCardProps> = ({
  workout,
  isCompleted,
  completionPercentage,
  getDifficultyColor,
}) => {
  return (
    <Card style={styles.workoutCard} variant="elevated">
      <View style={styles.workoutHeader}>
        <View style={styles.workoutInfo}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.workoutDescription}>{workout.description}</Text>
        </View>
        <View style={styles.workoutIcon}>
          <Text style={styles.workoutEmoji}>{isCompleted ? "✅" : "💪"}</Text>
        </View>
      </View>

      {completionPercentage > 0 && !isCompleted && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completionPercentage}% complete
          </Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{workout.duration}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              { color: getDifficultyColor(workout.difficulty) },
            ]}
          >
            {workout.difficulty}
          </Text>
          <Text style={styles.statLabel}>Difficulty</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {workout.calories > 0 ? workout.calories : "~300"}
          </Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
      </View>

      {workout.targetMuscles.length > 0 && (
        <View style={styles.musclesContainer}>
          <Text style={styles.musclesTitle}>Target Muscles</Text>
          <View style={styles.musclesList}>
            {workout.targetMuscles.map((muscle: string, index: number) => (
              <View key={index} style={styles.muscleTag}>
                <Text style={styles.muscleText}>{muscle}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {workout.equipment.length > 0 && (
        <View style={styles.equipmentContainer}>
          <Text style={styles.equipmentTitle}>Equipment Needed</Text>
          <View style={styles.equipmentList}>
            {workout.equipment.map((item, index) => (
              <View key={index} style={styles.equipmentTag}>
                <Text style={styles.equipmentText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  workoutCard: {
    marginVertical: THEME.spacing.md,
  },

  workoutHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: THEME.spacing.md,
  },

  workoutInfo: {
    flex: 1,
  },

  workoutName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },

  workoutDescription: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },

  workoutIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: THEME.spacing.md,
  },

  workoutEmoji: {
    fontSize: 24,
  },

  progressContainer: {
    marginBottom: THEME.spacing.md,
  },

  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.surface,
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: THEME.colors.primary,
    borderRadius: 4,
  },

  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    marginTop: THEME.spacing.xs,
    textAlign: "center",
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
    marginVertical: THEME.spacing.md,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 2,
  },

  musclesContainer: {
    marginBottom: THEME.spacing.md,
  },

  musclesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  musclesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
  },

  muscleTag: {
    backgroundColor: THEME.colors.primary + "20",
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.primary + "40",
  },

  muscleText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.medium,
  },

  equipmentContainer: {
    marginBottom: THEME.spacing.md,
  },

  equipmentTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  equipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs,
  },

  equipmentTag: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs / 2,
    borderRadius: THEME.borderRadius.md,
  },

  equipmentText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
});
