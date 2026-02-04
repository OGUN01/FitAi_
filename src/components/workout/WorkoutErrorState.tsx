import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { Button, THEME } from "../../components/ui";

interface WorkoutErrorStateProps {
  errorType: "no-data" | "no-exercises";
  onGoBack: () => void;
}

export const WorkoutErrorState: React.FC<WorkoutErrorStateProps> = ({
  errorType,
  onGoBack,
}) => {
  const config =
    errorType === "no-data"
      ? {
          emoji: "⚠️",
          title: "No Workout Data",
          subtitle: "Unable to load workout information",
        }
      : {
          emoji: "🏋️‍♂️",
          title: "No Exercises Found",
          subtitle: "This workout appears to be empty",
        };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>{config.emoji}</Text>
        <Text style={styles.errorText}>{config.title}</Text>
        <Text style={styles.errorSubtext}>{config.subtitle}</Text>
        <Button
          title="Go Back"
          onPress={onGoBack}
          variant="outline"
          style={styles.errorButton}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: THEME.spacing.xl,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: THEME.spacing.lg,
  },
  errorText: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.error,
    textAlign: "center",
    marginBottom: THEME.spacing.md,
  },
  errorSubtext: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    marginBottom: THEME.spacing.xl,
  },
  errorButton: {
    minWidth: 120,
  },
});
