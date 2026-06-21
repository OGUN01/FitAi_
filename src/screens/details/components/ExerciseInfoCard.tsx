import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../components/ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";

interface ExerciseInfoCardProps {
  name: string;
  description: string;
  difficulty: string;
  sets: number;
  reps: string;
  weight?: string;
  restTime: string;
  targetMuscles: string[];
}

export const ExerciseInfoCard: React.FC<ExerciseInfoCardProps> = ({
  name,
  description,
  difficulty,
  sets,
  reps,
  weight,
  restTime,
  targetMuscles,
}) => {
  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "beginner":
        return colors.success;
      case "intermediate":
        return colors.warning;
      case "advanced":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const formatDifficulty = (diff: string) => {
    return diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
  };

  return (
    <Card style={styles.exerciseCard} variant="elevated">
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{name}</Text>
          <Text style={styles.exerciseDescription}>{description}</Text>
        </View>
        <View style={styles.difficultyBadge}>
          <Text
            style={[
              styles.difficultyText,
              { color: getDifficultyColor(difficulty) },
            ]}
          >
            {formatDifficulty(difficulty)}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sets}</Text>
          <Text style={styles.statLabel}>Sets</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{reps}</Text>
          <Text style={styles.statLabel}>Reps</Text>
        </View>
        {weight && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{weight}</Text>
            <Text style={styles.statLabel}>Weight</Text>
          </View>
        )}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{restTime}</Text>
          <Text style={styles.statLabel}>Rest</Text>
        </View>
      </View>

      {targetMuscles.length > 0 && (
        <View style={styles.musclesContainer}>
          <Text style={styles.musclesTitle}>Target Muscles</Text>
          <View style={styles.musclesList}>
            {targetMuscles.map((muscle: string, index: number) => (
              <View key={index} style={styles.muscleTag}>
                <Text style={styles.muscleText}>{muscle}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  exerciseCard: {
    marginVertical: spacing.md,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  exerciseDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  difficultyBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginLeft: spacing.md,
  },
  difficultyText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
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
  },
  statValue: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
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
    backgroundColor: colors.primary + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary + "40",
  },
  muscleText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
});
