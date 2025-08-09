import React, { useState, useEffect, PropsWithChildren } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { Card, Button, THEME } from '../ui';

interface WorkoutTimerProps {
  isVisible: boolean;
  duration: number; // in seconds
  title?: string;
  onComplete: () => void;
  onCancel: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export const WorkoutTimer: React.FC<PropsWithChildren<WorkoutTimerProps>> = ({
  isVisible,
  duration,
  title = "Rest Timer",
  onComplete,
  onCancel,
  onPause,
  onResume,
  children,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Reset timer when duration or visibility changes
  useEffect(() => {
    if (isVisible) {
      setTimeRemaining(duration);
      setIsPaused(false);
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, [isVisible, duration]);

  // Timer countdown logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            onComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, isPaused, timeRemaining, onComplete]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle pause/resume
  const handlePauseResume = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      onPause?.();
    } else {
      onResume?.();
    }
  };

  // Calculate progress percentage
  const progressPercentage = ((duration - timeRemaining) / duration) * 100;

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Card style={styles.timerCard} variant="elevated">
          <View style={styles.timerContent}>
            {/* Optional visual (e.g., GIF) */}
            {children}

            {/* Title */}
            <Text style={styles.timerTitle}>{title}</Text>

            {/* Circular Progress Indicator */}
            <View style={styles.circularTimer}>
              <View style={styles.progressBackground}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      transform: [{ rotate: `${progressPercentage * 3.6}deg` }]
                    }
                  ]} 
                />
              </View>
              <View style={styles.timerDisplay}>
                <Text style={styles.timeText}>{formatTime(timeRemaining)}</Text>
                <Text style={styles.timeLabel}>
                  {isPaused ? 'Paused' : 'Remaining'}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progressPercentage)}% Complete
              </Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.modernControlButton, styles.outlineButton]}
                onPress={handlePauseResume}
              >
                <Text style={[styles.modernControlText, styles.outlineButtonText]}>
                  {isPaused ? "Resume" : "Pause"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modernControlButton, styles.primaryButton]}
                onPress={onComplete}
              >
                <Text style={[styles.modernControlText, styles.primaryButtonText]}>
                  Skip Rest
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modernControlButton, styles.outlineButton]}
                onPress={onCancel}
              >
                <Text style={[styles.modernControlText, styles.outlineButtonText]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Time Adjustments */}
            <View style={styles.quickAdjustments}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => setTimeRemaining(prev => Math.max(0, prev - 30))}
              >
                <Text style={styles.adjustButtonText}>-30s</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => setTimeRemaining(prev => prev + 30)}
              >
                <Text style={styles.adjustButtonText}>+30s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  timerCard: {
    width: '90%',
    maxWidth: 400,
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },
  
  timerContent: {
    alignItems: 'center',
    width: '100%',
  },
  
  timerTitle: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.lg,
    textAlign: 'center',
  },
  
  circularTimer: {
    width: 200,
    height: 200,
    marginBottom: THEME.spacing.lg,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  progressBackground: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: THEME.colors.backgroundSecondary,
  },
  
  progressFill: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: THEME.colors.primary,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-90deg' }],
  },
  
  timerDisplay: {
    alignItems: 'center',
  },
  
  timeText: {
    fontSize: 48,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    fontFamily: 'monospace',
  },
  
  timeLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  
  progressBarContainer: {
    width: '100%',
    marginBottom: THEME.spacing.lg,
  },
  
  progressBar: {
    height: 8,
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: 4,
    marginBottom: THEME.spacing.sm,
  },
  
  progressBarFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 4,
  },
  
  progressText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
  },
  
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },

  modernControlButton: {
    flex: 1,
    height: 44,
    borderRadius: THEME.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },

  primaryButton: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderColor: THEME.colors.border,
  },

  modernControlText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },

  primaryButtonText: {
    color: THEME.colors.surface,
  },

  outlineButtonText: {
    color: THEME.colors.text,
  },
  
  controlButton: {
    flex: 1,
    maxWidth: 100,
  },
  
  quickAdjustments: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.spacing.lg,
  },
  
  adjustButton: {
    backgroundColor: THEME.colors.backgroundSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
  },
  
  adjustButtonText: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
  },
});