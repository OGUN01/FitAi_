import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from '../../utils/constants';
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
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  exerciseNumber: {
    width: rw(32),
    height: rh(32),
    borderRadius: rbr(16),
    backgroundColor: ResponsiveTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },

  exerciseNumberText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.white,
  },

  exerciseInfo: {
    flex: 1,
  },

  exerciseName: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs / 2,
  },

  exerciseDetails: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs / 2,
  },

  exerciseRest: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  exerciseArrow: {
    width: rw(32),
    height: rh(32),
    borderRadius: rbr(16),
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  exerciseArrowText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },

  exerciseMuscles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.xs / 2,
  },

  exerciseMuscleTag: {
    backgroundColor: ResponsiveTheme.colors.secondary + "20",
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    paddingVertical: ResponsiveTheme.spacing.xs / 4,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  exerciseMuscleText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.secondary,
  },
});
