import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh, rbr } from '../../utils/responsive';

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
    marginVertical: ResponsiveTheme.spacing.md,
  },

  workoutHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  workoutInfo: {
    flex: 1,
  },

  workoutName: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  workoutDescription: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(22),
  },

  workoutIcon: {
    width: rw(60),
    height: rh(60),
    borderRadius: rbr(30),
    backgroundColor: ResponsiveTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: ResponsiveTheme.spacing.md,
  },

  workoutEmoji: {
    fontSize: rf(24),
  },

  progressContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  progressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(4),
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(4),
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    marginTop: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    marginVertical: ResponsiveTheme.spacing.md,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs / 2,
  },

  musclesContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  musclesTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  musclesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
  },

  muscleTag: {
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs / 2,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "40",
  },

  muscleText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  equipmentContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  equipmentTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  equipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs,
  },

  equipmentTag: {
    backgroundColor: ResponsiveTheme.colors.surface,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs / 2,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  equipmentText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
