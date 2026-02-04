import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../../../components/ui";

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
        return THEME.colors.success;
      case "intermediate":
        return THEME.colors.warning;
      case "advanced":
        return THEME.colors.error;
      default:
        return THEME.colors.textSecondary;
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
    marginVertical: THEME.spacing.md,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: THEME.spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: THEME.fontSize.xxl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  exerciseDescription: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    lineHeight: 22,
  },
  difficultyBadge: {
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.md,
    marginLeft: THEME.spacing.md,
  },
  difficultyText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.semibold,
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
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },
  statLabel: {
    fontSize: THEME.fontSize.xs,
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
});
