import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../components/ui";

interface NextExercisePreviewProps {
  exerciseName: string;
}

export const NextExercisePreview: React.FC<NextExercisePreviewProps> = ({
  exerciseName,
}) => (
  <View style={styles.nextExercisePreview}>
    <Text style={styles.nextExerciseTitle}>Next Up:</Text>
    <Text style={styles.nextExerciseName}>{exerciseName}</Text>
  </View>
);

const styles = StyleSheet.create({
  nextExercisePreview: {
    backgroundColor: THEME.colors.primary + "20",
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.primary,
  },
  nextExerciseTitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.semibold,
    marginBottom: THEME.spacing.xs,
  },
  nextExerciseName: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
  },
});
