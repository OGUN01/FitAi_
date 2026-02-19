import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MigrationProgress,
  MigrationResult,
} from "../../../services/migration";

interface StatusMessageProps {
  progress: MigrationProgress | null;
  result: MigrationResult | null;
  celebrationAnimation: Animated.Value;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({
  progress,
  result,
  celebrationAnimation,
}) => {
  if (result?.success) {
    return (
      <Animated.View
        style={[
          styles.statusContainer,
          styles.statusSuccess,
          {
            transform: [
              {
                scale: celebrationAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.1],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="checkmark-circle" size={32} color="#10B981" />
        <Text style={styles.statusTitle}>Migration Complete!</Text>
        <Text style={styles.statusMessage}>
          Your data has been successfully synced to the cloud.
        </Text>
        {result.migratedDataCount && (
          <View style={styles.migrationStats}>
            <Text style={styles.statsText}>
              Migrated: {result.migratedDataCount.workoutSessions} workouts,{" "}
              {result.migratedDataCount.mealLogs} meals,{" "}
              {result.migratedDataCount.bodyMeasurements} measurements
            </Text>
          </View>
        )}
      </Animated.View>
    );
  }

  if (result && !result.success) {
    return (
      <View style={[styles.statusContainer, styles.statusError]}>
        <Ionicons name="alert-circle" size={32} color="#EF4444" />
        <Text style={styles.statusTitle}>Migration Failed</Text>
        <Text style={styles.statusMessage}>
          {result.errors[0]?.message || "An error occurred during migration."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.statusContainer}>
      <Text style={styles.statusTitle}>
        {progress?.status === "running"
          ? "Migrating Your Data"
          : "Preparing Migration"}
      </Text>
      <Text style={styles.statusMessage}>
        {progress?.message ||
          "Please wait while we sync your data to the cloud."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  statusSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusError: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 10,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  migrationStats: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
  },
  statsText: {
    fontSize: 14,
    color: "#A5B4FC",
    textAlign: "center",
  },
});
