import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";

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
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: ResponsiveTheme.colors.primary,
  },
  nextExerciseTitle: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  nextExerciseName: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});
