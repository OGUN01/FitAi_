import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card, THEME } from "../ui";

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
    marginBottom: THEME.spacing.sm,
  },

  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: THEME.spacing.sm,
  },

  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: THEME.spacing.sm,
  },

  exerciseNumberText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.white,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs / 2,
  },

  exerciseDetails: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.xs / 2,
  },

  exerciseRest: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },

  exerciseArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: THEME.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  exerciseArrowText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  exerciseMuscles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: THEME.spacing.xs / 2,
  },

  exerciseMuscleTag: {
    backgroundColor: THEME.colors.secondary + "20",
    paddingHorizontal: THEME.spacing.xs,
    paddingVertical: THEME.spacing.xs / 4,
    borderRadius: THEME.borderRadius.sm,
  },

  exerciseMuscleText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.secondary,
  },
});
