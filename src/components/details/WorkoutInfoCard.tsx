import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rf, rw, rh, rbr } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from '../../utils/colors';

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
  const displayCalories = workout.calories > 0 ? String(workout.calories) : "—";
  const workoutIconName = isCompleted ? "checkmark-circle" : "fitness";

  return (
    <Card style={styles.workoutCard} variant="elevated">
      <View style={styles.workoutHeader}>
        <View style={styles.workoutInfo}>
          <Text
            style={styles.workoutName}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {workout.name}
          </Text>
          <Text
            style={styles.workoutDescription}
            numberOfLines={3}
            ellipsizeMode="tail"
          >
            {workout.description}
          </Text>
        </View>
        <View style={styles.workoutIcon}>
          <Ionicons name={workoutIconName as any} size={rf(24)} color={colors.white} />
        </View>
      </View>

      {completionPercentage > 0 && !isCompleted && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(completionPercentage, 6)}%` },
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
          <Text style={styles.statValue}>{displayCalories}</Text>
          <Text style={styles.statLabel}>Calories</Text>
        </View>
      </View>

      {workout.targetMuscles.length > 0 && (
        <View style={styles.musclesContainer}>
          <Text style={styles.musclesTitle}>Target Muscles</Text>
          <View style={styles.musclesList}>
            {workout.targetMuscles.map((muscle: string, index: number) => (
              <View key={index} style={styles.muscleTag}>
                <Text style={styles.muscleText} numberOfLines={1}>{muscle}</Text>
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
                <Text style={styles.equipmentText} numberOfLines={1}>{item}</Text>
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
    marginVertical: spacing.md,
  },

  workoutHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },

  workoutInfo: {
    flex: 1,
  },

  workoutName: {
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  workoutDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: rf(22),
  },

  workoutIcon: {
    width: rw(60),
    height: rh(60),
    borderRadius: rbr(30),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
    overflow: "hidden",
  },

  progressContainer: {
    marginBottom: spacing.md,
  },

  progressBar: {
    height: rh(8),
    backgroundColor: colors.surface,
    borderRadius: rbr(4),
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rbr(4),
  },

  progressText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: "center",
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.md,
  },

  statItem: {
    alignItems: "center",
    flex: 1,
  },

  statValue: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },

  musclesContainer: {
    marginBottom: spacing.md,
  },

  musclesTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  musclesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  muscleTag: {
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    maxWidth: rw(160),
  },

  muscleText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },

  equipmentContainer: {
    marginBottom: spacing.md,
  },

  equipmentTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  equipmentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },

  equipmentTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.md,
    maxWidth: rw(160),
  },

  equipmentText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
