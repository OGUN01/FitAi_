/**
 * Migration Progress Modal
 * Shows real-time progress during data migration with professional UI
 * Provides user feedback and handles migration completion/errors
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rbr, rh, rw, dimensions } from "../../utils/responsive";
import { migrationManager } from "../../services/migrationManager";
import { MigrationStatus } from "../../types/profileData";

// Clamped screen width (capped to 480 on web/tablet) so the modal sizes against
// the mobile design width, not a 1920px desktop window. `dimensions` carries
// its own fallback when Dimensions is mocked (jest).
const SCREEN_WIDTH = dimensions.screenWidth;

interface MigrationStatusModalProps {
  visible: boolean;
  userId: string;
  onComplete: (success: boolean) => void;
  onCancel?: () => void;
}

export const MigrationProgressModal: React.FC<MigrationStatusModalProps> = ({
  visible,
  userId,
  onComplete,
  onCancel,
}) => {
  const [progress, setProgress] = useState<MigrationStatus | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);

  // Animation values
  const progressAnim = new Animated.Value(0);
  const fadeAnim = new Animated.Value(0);

  useEffect(() => {
    if (visible) {
      // Show modal animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start migration
      startMigration();
    } else {
      // Hide modal animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (progress) {
      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: progress.progress / 100,
        duration: 500,
        useNativeDriver: false,
      }).start();

      setIsComplete(progress.isComplete ?? false);
      setHasErrors(progress.hasErrors ?? false);

      // Auto-close on completion after delay
      if (progress.isComplete && !progress.hasErrors) {
        setTimeout(() => {
          onComplete(true);
        }, 2000);
      } else if (progress.hasErrors) {
        setTimeout(() => {
          onComplete(false);
        }, 3000);
      }
    }
  }, [progress]);

  const startMigration = async () => {
    try {
      // Set up progress callback
      migrationManager.setProgressCallback((progress) =>
        setProgress(progress as unknown as MigrationStatus),
      );

      // Check if migration is needed
      const migrationNeeded =
        await migrationManager.checkProfileMigrationNeeded(userId);

      if (!migrationNeeded) {
        setProgress({
          isInProgress: false,
          step: "complete",
          currentStep: "complete",
          progress: 100,
          totalSteps: 1,
          completedSteps: 1,
          errors: [],
          message: "No migration needed - you're all set!",
          isComplete: true,
          hasErrors: false,
        });
        return;
      }

      // Start the migration
      const result = await migrationManager.startProfileMigration(userId);

      if (!result.success) {
        setProgress({
          isInProgress: false,
          step: "error",
          currentStep: "error",
          progress: 0,
          totalSteps: 1,
          completedSteps: 0,
          errors: result.errors,
          message: `Migration failed: ${result.errors.join(", ")}`,
          isComplete: true,
          hasErrors: true,
        });
      }
    } catch (error) {
      console.error("❌ Migration error:", error);
      setProgress({
        isInProgress: false,
        step: "error",
        currentStep: "error",
        progress: 0,
        totalSteps: 1,
        completedSteps: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        message: "Migration failed due to an unexpected error",
        isComplete: true,
        hasErrors: true,
      });
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case "validate":
        return "🔍";
      case "backup":
        return "💾";
      case "conflicts":
        return "⚖️";
      case "personal":
        return "👤";
      case "goals":
        return "🎯";
      case "diet":
        return "🥗";
      case "workout":
        return "💪";
      case "complete":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⏳";
    }
  };

  const getStepTitle = (step: string) => {
    switch (step) {
      case "validate":
        return "Validating Data";
      case "backup":
        return "Creating Backup";
      case "conflicts":
        return "Checking Conflicts";
      case "personal":
        return "Personal Information";
      case "goals":
        return "Fitness Goals";
      case "diet":
        return "Diet Preferences";
      case "workout":
        return "Workout Preferences";
      case "complete":
        return "Migration Complete";
      case "error":
        return "Migration Failed";
      default:
        return "Processing";
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onCancel}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Syncing Your Data</Text>
              <Text style={styles.subtitle}>
                We're securely transferring your profile data to the cloud
              </Text>
            </View>

            {/* Progress Section */}
            <View style={styles.progressSection}>
              {progress && (
                <>
                  {/* Step Icon and Title */}
                  <View style={styles.stepInfo}>
                    <Text style={styles.stepIcon}>
                      {getStepIcon(progress.step ?? "")}
                    </Text>
                    <Text style={styles.stepTitle}>
                      {getStepTitle(progress.step ?? "")}
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          {
                            width: progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ["0%", "100%"],
                            }),
                            backgroundColor: hasErrors
                              ? colors.error
                              : isComplete
                                ? colors.success
                                : colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(progress.progress)}%
                    </Text>
                  </View>

                  {/* Status Message */}
                  <Text
                    style={[
                      styles.statusMessage,
                      hasErrors && styles.errorMessage,
                      isComplete && !hasErrors && styles.successMessage,
                    ]}
                  >
                    {progress.message}
                  </Text>
                </>
              )}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {isComplete && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    hasErrors ? styles.retryButton : styles.continueButton,
                  ]}
                  onPress={() => onComplete(!hasErrors)}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      hasErrors
                        ? styles.retryButtonText
                        : styles.continueButtonText,
                    ]}
                  >
                    {hasErrors ? "Try Again" : "Continue"}
                  </Text>
                </TouchableOpacity>
              )}

              {!isComplete && onCancel && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },

  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: SCREEN_WIDTH - spacing.lg * 2,
    maxWidth: rw(400),
    shadowColor: colors.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.25)',
    elevation: 20,
  },

  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },

  title: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },

  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
  },

  progressSection: {
    marginBottom: spacing.xl,
  },

  stepInfo: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  stepIcon: {
    fontSize: rf(32),
    marginBottom: spacing.sm,
  },

  stepTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    textAlign: "center",
  },

  progressBarContainer: {
    marginBottom: spacing.md,
  },

  progressBarBackground: {
    height: rh(8),
    backgroundColor: colors.border,
    borderRadius: rbr(4),
    overflow: "hidden",
    marginBottom: spacing.sm,
  },

  progressBarFill: {
    height: "100%",
    borderRadius: rbr(4),
  },

  progressText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    textAlign: "center",
  },

  statusMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
  },

  errorMessage: {
    color: colors.error,
  },

  successMessage: {
    color: colors.success,
  },

  actions: {
    gap: spacing.sm,
  },

  actionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },

  continueButton: {
    backgroundColor: colors.primary,
  },

  retryButton: {
    backgroundColor: colors.error,
  },

  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },

  continueButtonText: {
    color: colors.white,
  },

  retryButtonText: {
    color: colors.white,
  },

  cancelButton: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },

  cancelButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

// Export with both names for backwards compatibility
export const MigrationStatusModal = MigrationProgressModal;
