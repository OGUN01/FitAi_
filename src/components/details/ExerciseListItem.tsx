import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rw, rh, rbr } from '../../utils/responsive';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight?: string;
  duration?: string;
  restTime: string;
  instructions: string[];
  targetMuscles: string[];
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  equipment: string[];
}

interface ExerciseListItemProps {
  exercise: Exercise;
  index: number;
  onPress: (exercise: Exercise) => void;
}

export const ExerciseListItem: React.FC<ExerciseListItemProps> = ({
  exercise,
  index,
  onPress,
}) => {
  return (
    <Card
      key={exercise.id}
      style={styles.exerciseCard}
      onPress={() => onPress(exercise)}
    >
      <View style={styles.exerciseHeader}>
        <View style={styles.exerciseNumber}>
          <Text style={styles.exerciseNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.exerciseDetails}>
            {exercise.sets} sets × {exercise.reps} reps
            {exercise.weight && ` • ${exercise.weight}`}
          </Text>
          <Text style={styles.exerciseRest}>Rest: {exercise.restTime}</Text>
        </View>
        <TouchableOpacity
          style={styles.exerciseArrow}
          onPress={() => onPress(exercise)}
        >
          <Text style={styles.exerciseArrowText}>→</Text>
        </TouchableOpacity>
      </View>

      {exercise.targetMuscles.length > 0 && (
        <View style={styles.exerciseMuscles}>
          {exercise.targetMuscles.map((muscle, muscleIndex) => (
            <View key={muscleIndex} style={styles.exerciseMuscleTag}>
              <Text style={styles.exerciseMuscleText}>{muscle}</Text>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  exerciseCard: {
    marginBottom: spacing.sm,
  },

  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  exerciseNumber: {
    width: rw(32),
    height: rh(32),
    borderRadius: rbr(16),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  exerciseNumberText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },

  exerciseDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },

  exerciseRest: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  exerciseArrow: {
    width: rw(32),
    height: rh(32),
    borderRadius: rbr(16),
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  exerciseArrowText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },

  exerciseMuscles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs / 2,
  },

  exerciseMuscleTag: {
    backgroundColor: colors.secondary + "20",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 4,
    borderRadius: borderRadius.sm,
  },

  exerciseMuscleText: {
    fontSize: fontSize.xs,
    color: colors.secondary,
  },
});
