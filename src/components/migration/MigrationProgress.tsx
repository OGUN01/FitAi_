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
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rs, rh, rw } from "../../utils/responsive";

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
              colors={[
                ResponsiveTheme.colors.primaryDark,
                "#7C3AED",
                ResponsiveTheme.colors.pink,
              ]}
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
                  size={rs(20)}
                  color={
                    isCompleted
                      ? ResponsiveTheme.colors.successAlt
                      : isCurrent
                        ? ResponsiveTheme.colors.primaryDark
                        : ResponsiveTheme.colors.textTertiary
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
          <Ionicons
            name="checkmark-circle"
            size={rs(32)}
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
            size={rs(32)}
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
            colors={[
              ResponsiveTheme.colors.backgroundSecondary,
              ResponsiveTheme.colors.background,
            ]}
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
    backgroundColor: ResponsiveTheme.colors.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    padding: rp(20),
  },
  container: {
    width: "100%",
    maxWidth: rw(400),
    borderRadius: rbr(20),
    overflow: "hidden",
    elevation: 10,
    boxShadow: '0px 10px 20px rgba(0,0,0,0.3)',
  },
  gradient: {
    padding: rp(30),
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: rp(30),
  },
  statusSuccess: {
    backgroundColor: ResponsiveTheme.colors.successTint,
    borderRadius: rbr(15),
    padding: rp(20),
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusError: {
    backgroundColor: ResponsiveTheme.colors.errorTint,
    borderRadius: rbr(15),
    padding: rp(20),
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
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
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    borderRadius: rbr(10),
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.3)",
  },
  statsText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.info,
    textAlign: "center",
  },
  progressBarContainer: {
    marginBottom: rp(30),
  },
  progressBarBackground: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    borderRadius: rbr(4),
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: rbr(4),
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    fontSize: rf(18),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.white,
    textAlign: "center",
    marginTop: rp(10),
  },
  stepsContainer: {
    marginBottom: rp(30),
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(15),
    paddingHorizontal: rp(10),
  },
  stepIcon: {
    width: rs(40),
    height: rs(40),
    borderRadius: rbr(20),
    justifyContent: "center",
    alignItems: "center",
    marginRight: rp(15),
    borderWidth: 2,
  },
  stepIconCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: ResponsiveTheme.colors.successAlt,
  },
  stepIconCurrent: {
    backgroundColor: "rgba(79, 70, 229, 0.2)",
    borderColor: ResponsiveTheme.colors.primaryDark,
  },
  stepIconUpcoming: {
    backgroundColor: "rgba(107, 114, 128, 0.1)",
    borderColor: ResponsiveTheme.colors.textTertiary,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(2),
  },
  stepTitleCompleted: {
    color: ResponsiveTheme.colors.successAlt,
  },
  stepTitleCurrent: {
    color: ResponsiveTheme.colors.white,
  },
  stepDescription: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textTertiary,
    lineHeight: rf(18),
  },
  stepDescriptionCurrent: {
    color: ResponsiveTheme.colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: rp(15),
  },
  completeButton: {
    backgroundColor: ResponsiveTheme.colors.successAlt,
    paddingVertical: rp(15),
    paddingHorizontal: rp(30),
    borderRadius: rbr(12),
    alignItems: "center",
  },
  completeButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(16),
    fontWeight: "600",
  },
  retryButton: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.primaryDark,
    paddingVertical: rp(15),
    borderRadius: rbr(12),
    alignItems: "center",
  },
  retryButtonText: {
    color: ResponsiveTheme.colors.white,
    fontSize: rf(16),
    fontWeight: "600",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    paddingVertical: rp(15),
    borderRadius: rbr(12),
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.errorAlt,
  },
  cancelButtonText: {
    color: ResponsiveTheme.colors.errorAlt,
    fontSize: rf(16),
    fontWeight: "600",
  },
});

export default MigrationProgressComponent;
