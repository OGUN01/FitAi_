import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../../components/ui";
import { ResponsiveTheme } from "../../../utils/constants";

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
        return ResponsiveTheme.colors.success;
      case "intermediate":
        return ResponsiveTheme.colors.warning;
      case "advanced":
        return ResponsiveTheme.colors.error;
      default:
        return ResponsiveTheme.colors.textSecondary;
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
    marginVertical: ResponsiveTheme.spacing.md,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  exerciseDescription: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 22,
  },
  difficultyBadge: {
    backgroundColor: ResponsiveTheme.colors.surface,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    marginLeft: ResponsiveTheme.spacing.md,
  },
  difficultyText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
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
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },
  statLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
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
});
