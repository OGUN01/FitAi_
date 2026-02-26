import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  MigrationProgress,
  MigrationResult,
} from "../../../services/migration";
import { rf, rp, rbr } from "../../../utils/responsive";
import { ResponsiveTheme } from "../../../utils/constants";

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
        <Ionicons
          name="checkmark-circle"
          size={rf(32)}
          color={ResponsiveTheme.colors.successAlt}
        />
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
        <Ionicons
          name="alert-circle"
          size={rf(32)}
          color={ResponsiveTheme.colors.errorAlt}
        />
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
    marginBottom: rp(30),
  },
  statusSuccess: {
    backgroundColor: ResponsiveTheme.colors.successTint,
    borderRadius: rbr(15),
    padding: rp(20),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.successAlt,
  },
  statusError: {
    backgroundColor: ResponsiveTheme.colors.errorTint,
    borderRadius: rbr(15),
    padding: rp(20),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.errorAlt,
  },
  statusTitle: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.white,
    marginTop: rp(10),
    textAlign: "center",
  },
  statusMessage: {
    fontSize: rf(16),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(8),
    textAlign: "center",
    lineHeight: rf(22),
  },
  migrationStats: {
    marginTop: rp(15),
    padding: rp(10),
    backgroundColor: ResponsiveTheme.colors.primaryTint,
    borderRadius: rbr(10),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primaryFaded,
  },
  statsText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.info,
    textAlign: "center",
  },
});
