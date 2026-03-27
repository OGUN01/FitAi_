import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../components/ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
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
          icon: "alert-circle-outline" as const,
          iconColor: ResponsiveTheme.colors.error,
          title: "No Workout Data",
          subtitle: "Unable to load workout information",
        }
      : {
          icon: "barbell-outline" as const,
          iconColor: ResponsiveTheme.colors.primary,
          title: "No Exercises Found",
          subtitle: "This workout appears to be empty",
        };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.errorContainer}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={config.icon}
            size={rf(36)}
            color={config.iconColor}
          />
        </View>
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
    backgroundColor: ResponsiveTheme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: ResponsiveTheme.spacing.xl,
  },
  iconContainer: {
    width: rw(72),
    height: rw(72),
    borderRadius: rw(36),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  errorText: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.error,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  errorSubtext: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  errorButton: {
    minWidth: rw(120),
  },
});
