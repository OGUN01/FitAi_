/**
 * Migration Progress Modal
 * Shows real-time progress during data migration with professional UI
 * Provides user feedback and handles migration completion/errors
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { THEME } from '../ui';
import { migrationManager, MigrationProgress } from '../../services/migrationManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MigrationProgressModalProps {
  visible: boolean;
  userId: string;
  onComplete: (success: boolean) => void;
  onCancel?: () => void;
}

export const MigrationProgressModal: React.FC<MigrationProgressModalProps> = ({
  visible,
  userId,
  onComplete,
  onCancel,
}) => {
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
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

      setIsComplete(progress.isComplete);
      setHasErrors(progress.hasErrors);

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
      migrationManager.setProgressCallback(setProgress);

      // Check if migration is needed
      const migrationNeeded = await migrationManager.checkProfileMigrationNeeded(userId);
      
      if (!migrationNeeded) {
        setProgress({
          step: 'complete',
          progress: 100,
          message: 'No migration needed - you\'re all set!',
          isComplete: true,
          hasErrors: false,
        });
        return;
      }

      // Start the migration
      const result = await migrationManager.startProfileMigration(userId);
      
      if (!result.success) {
        setProgress({
          step: 'error',
          progress: 0,
          message: `Migration failed: ${result.errors.join(', ')}`,
          isComplete: true,
          hasErrors: true,
        });
      }
    } catch (error) {
      console.error('❌ Migration error:', error);
      setProgress({
        step: 'error',
        progress: 0,
        message: 'Migration failed due to an unexpected error',
        isComplete: true,
        hasErrors: true,
      });
    }
  };

  const getStepIcon = (step: string) => {
    switch (step) {
      case 'validate':
        return '🔍';
      case 'backup':
        return '💾';
      case 'conflicts':
        return '⚖️';
      case 'personal':
        return '👤';
      case 'goals':
        return '🎯';
      case 'diet':
        return '🥗';
      case 'workout':
        return '💪';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStepTitle = (step: string) => {
    switch (step) {
      case 'validate':
        return 'Validating Data';
      case 'backup':
        return 'Creating Backup';
      case 'conflicts':
        return 'Checking Conflicts';
      case 'personal':
        return 'Personal Information';
      case 'goals':
        return 'Fitness Goals';
      case 'diet':
        return 'Diet Preferences';
      case 'workout':
        return 'Workout Preferences';
      case 'complete':
        return 'Migration Complete';
      case 'error':
        return 'Migration Failed';
      default:
        return 'Processing';
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
                      {getStepIcon(progress.step)}
                    </Text>
                    <Text style={styles.stepTitle}>
                      {getStepTitle(progress.step)}
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
                              outputRange: ['0%', '100%'],
                            }),
                            backgroundColor: hasErrors 
                              ? THEME.colors.error 
                              : isComplete 
                                ? THEME.colors.success 
                                : THEME.colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {Math.round(progress.progress)}%
                    </Text>
                  </View>

                  {/* Status Message */}
                  <Text style={[
                    styles.statusMessage,
                    hasErrors && styles.errorMessage,
                    isComplete && !hasErrors && styles.successMessage,
                  ]}>
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
                  <Text style={[
                    styles.actionButtonText,
                    hasErrors ? styles.retryButtonText : styles.continueButtonText,
                  ]}>
                    {hasErrors ? 'Try Again' : 'Continue'}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
  },

  modal: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.xl,
    padding: THEME.spacing.xl,
    width: SCREEN_WIDTH - (THEME.spacing.lg * 2),
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },

  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
  },

  title: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
    textAlign: 'center',
  },

  subtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  progressSection: {
    marginBottom: THEME.spacing.xl,
  },

  stepInfo: {
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },

  stepIcon: {
    fontSize: 32,
    marginBottom: THEME.spacing.sm,
  },

  stepTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    textAlign: 'center',
  },

  progressBarContainer: {
    marginBottom: THEME.spacing.md,
  },

  progressBarBackground: {
    height: 8,
    backgroundColor: THEME.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: THEME.spacing.sm,
  },

  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  progressText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },

  statusMessage: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  errorMessage: {
    color: THEME.colors.error,
  },

  successMessage: {
    color: THEME.colors.success,
  },

  actions: {
    gap: THEME.spacing.sm,
  },

  actionButton: {
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
  },

  continueButton: {
    backgroundColor: THEME.colors.primary,
  },

  retryButton: {
    backgroundColor: THEME.colors.error,
  },

  actionButtonText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
  },

  continueButtonText: {
    color: THEME.colors.white,
  },

  retryButtonText: {
    color: THEME.colors.white,
  },

  cancelButton: {
    paddingVertical: THEME.spacing.sm,
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
});
