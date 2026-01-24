// Migration Progress Component for Track B Infrastructure
// Provides smooth animations and progress tracking for data migration

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  MigrationProgress as MigrationProgressType,
  MigrationResult,
} from "../../services/migration";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface MigrationProgressProps {
  visible: boolean;
  progress: MigrationProgressType | null;
  result: MigrationResult | null;
  onComplete: () => void;
  onCancel: () => void;
  allowCancel?: boolean;
}

interface MigrationStepInfo {
  name: string;
  title: string;
  description: string;
  icon: string;
}

// ============================================================================
// MIGRATION STEPS CONFIGURATION
// ============================================================================

const MIGRATION_STEPS: MigrationStepInfo[] = [
  {
    name: "validateData",
    title: "Validating Data",
    description: "Checking data integrity and consistency",
    icon: "checkmark-circle-outline",
  },
  {
    name: "transformData",
    title: "Transforming Data",
    description: "Converting data to cloud format",
    icon: "swap-horizontal-outline",
  },
  {
    name: "uploadUserProfile",
    title: "Uploading Profile",
    description: "Syncing your personal information",
    icon: "person-outline",
  },
  {
    name: "uploadFitnessData",
    title: "Uploading Workouts",
    description: "Syncing your fitness data and workouts",
    icon: "fitness-outline",
  },
  {
    name: "uploadNutritionData",
    title: "Uploading Nutrition",
    description: "Syncing your meals and nutrition logs",
    icon: "restaurant-outline",
  },
  {
    name: "uploadProgressData",
    title: "Uploading Progress",
    description: "Syncing your achievements and measurements",
    icon: "trending-up-outline",
  },
  {
    name: "verifyMigration",
    title: "Verifying Data",
    description: "Ensuring all data was uploaded correctly",
    icon: "shield-checkmark-outline",
  },
  {
    name: "cleanupLocal",
    title: "Cleaning Up",
    description: "Finalizing migration and cleanup",
    icon: "trash-outline",
  },
];

// ============================================================================
// MIGRATION PROGRESS COMPONENT
// ============================================================================

export const MigrationProgressComponent: React.FC<MigrationProgressProps> = ({
  visible,
  progress,
  result,
  onComplete,
  onCancel,
  allowCancel = true,
}) => {
  const [progressAnimation] = useState(new Animated.Value(0));
  const [stepAnimations] = useState(
    MIGRATION_STEPS.map(() => new Animated.Value(0)),
  );
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [celebrationAnimation] = useState(new Animated.Value(0));

  const screenWidth = Dimensions.get("window").width;

  // ============================================================================
  // ANIMATION EFFECTS
  // ============================================================================

  useEffect(() => {
    if (progress) {
      // Animate progress bar
      Animated.timing(progressAnimation, {
        toValue: progress.percentage / 100,
        duration: 500,
        useNativeDriver: false,
      }).start();

      // Animate current step
      const currentStepIndex = MIGRATION_STEPS.findIndex(
        (step) => step.name === progress.currentStep,
      );

      if (currentStepIndex >= 0) {
        // Animate completed steps
        stepAnimations.forEach((animation, index) => {
          if (index < currentStepIndex) {
            Animated.timing(animation, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }).start();
          } else if (index === currentStepIndex) {
            // Pulse current step
            Animated.loop(
              Animated.sequence([
                Animated.timing(animation, {
                  toValue: 0.7,
                  duration: 600,
                  useNativeDriver: true,
                }),
                Animated.timing(animation, {
                  toValue: 1,
                  duration: 600,
                  useNativeDriver: true,
                }),
              ]),
            ).start();
          }
        });
      }
    }
  }, [progress]);

  useEffect(() => {
    if (result?.success) {
      // Celebration animation
      Animated.sequence([
        Animated.timing(celebrationAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(celebrationAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [result]);

  // ============================================================================
  // RENDER METHODS
  // ============================================================================

  const renderProgressBar = () => {
    const progressPercentage = progress?.percentage || 0;

    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={["#4F46E5", "#7C3AED", "#EC4899"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.progressGradient}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressText}>{progressPercentage}%</Text>
      </View>
    );
  };

  const renderMigrationSteps = () => {
    const currentStepIndex = progress
      ? MIGRATION_STEPS.findIndex((step) => step.name === progress.currentStep)
      : -1;

    return (
      <View style={styles.stepsContainer}>
        {MIGRATION_STEPS.map((step, index) => {
          const isCompleted = progress ? index < currentStepIndex : false;
          const isCurrent = progress ? index === currentStepIndex : false;
          const isUpcoming = progress ? index > currentStepIndex : true;

          return (
            <Animated.View
              key={step.name}
              style={[
                styles.stepItem,
                {
                  opacity: stepAnimations[index],
                  transform: [
                    {
                      scale: isCurrent
                        ? stepAnimations[index]
                        : isCompleted
                          ? 1
                          : 0.8,
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.stepIcon,
                  isCompleted && styles.stepIconCompleted,
                  isCurrent && styles.stepIconCurrent,
                  isUpcoming && styles.stepIconUpcoming,
                ]}
              >
                <Ionicons
                  name={isCompleted ? "checkmark" : (step.icon as any)}
                  size={20}
                  color={
                    isCompleted ? "#10B981" : isCurrent ? "#4F46E5" : "#6B7280"
                  }
                />
              </View>
              <View style={styles.stepContent}>
                <Text
                  style={[
                    styles.stepTitle,
                    isCompleted && styles.stepTitleCompleted,
                    isCurrent && styles.stepTitleCurrent,
                  ]}
                >
                  {step.title}
                </Text>
                <Text
                  style={[
                    styles.stepDescription,
                    isCurrent && styles.stepDescriptionCurrent,
                  ]}
                >
                  {step.description}
                </Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderStatusMessage = () => {
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

  const renderActionButtons = () => {
    if (result?.success) {
      return (
        <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
          <Text style={styles.completeButtonText}>Continue</Text>
        </TouchableOpacity>
      );
    }

    if (result && !result.success) {
      return (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.retryButton} onPress={onCancel}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (allowCancel && progress?.status === "running") {
      return (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel Migration</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={["#1F2937", "#111827"]}
            style={styles.gradient}
          >
            {renderStatusMessage()}
            {renderProgressBar()}
            {renderMigrationSteps()}
            {renderActionButtons()}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  container: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradient: {
    padding: 30,
  },
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
  progressBarContainer: {
    marginBottom: 30,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "rgba(75, 85, 99, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 10,
  },
  stepsContainer: {
    marginBottom: 30,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
    borderWidth: 2,
  },
  stepIconCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "#10B981",
  },
  stepIconCurrent: {
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    borderColor: "#4F46E5",
  },
  stepIconUpcoming: {
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    borderColor: "#6B7280",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 2,
  },
  stepTitleCompleted: {
    color: "#10B981",
  },
  stepTitleCurrent: {
    color: "#FFFFFF",
  },
  stepDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
  stepDescriptionCurrent: {
    color: "#9CA3AF",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  completeButton: {
    backgroundColor: "#10B981",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
  },
  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  retryButton: {
    flex: 1,
    backgroundColor: "#4F46E5",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default MigrationProgressComponent;
