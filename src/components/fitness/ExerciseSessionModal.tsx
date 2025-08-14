import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { Card, Button, THEME } from '../ui';
import { ExerciseGifPlayer } from './ExerciseGifPlayer';

interface ExerciseSessionModalProps {
  isVisible: boolean;
  onComplete: () => void;
  onCancel: () => void;
  exerciseId: string;
  exerciseName: string;
  reps: string;
  currentSet: number;
  totalSets: number;
}

export const ExerciseSessionModal: React.FC<ExerciseSessionModalProps> = ({
  isVisible,
  onComplete,
  onCancel,
  exerciseId,
  exerciseName,
  reps,
  currentSet,
  totalSets,
}) => {
  const [breathingAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(0));
  
  // Breathing animation effect
  useEffect(() => {
    if (isVisible) {
      // Start breathing animation
      const breathingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, {
            toValue: 1.2,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(breathingAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      // Start pulse animation  
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );

      breathingAnimation.start();
      pulseAnimation.start();

      return () => {
        breathingAnimation.stop();
        pulseAnimation.stop();
      };
    }
  }, [isVisible, breathingAnim, pulseAnim]);

  if (!isVisible) return null;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Card style={styles.sessionCard} variant="elevated">
          <View style={styles.sessionContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.setIndicator}>
                Set {currentSet} of {totalSets}
              </Text>
              <Text style={styles.repsText}>{reps} reps</Text>
            </View>

            {/* Breathing Circle with Exercise GIF */}
            <View style={styles.animationContainer}>
              {/* Outer breathing circles */}
              <Animated.View
                style={[
                  styles.breathingCircleOuter,
                  {
                    transform: [{ scale: breathingAnim }],
                    opacity: pulseAnim,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.breathingCircleMiddle,
                  {
                    transform: [{ scale: breathingAnim }],
                  },
                ]}
              />
              
              {/* Exercise GIF in center */}
              <View style={styles.exerciseGifContainer}>
                <ExerciseGifPlayer
                  exerciseId={exerciseId}
                  exerciseName={exerciseName}
                  height={180}
                  width={180}
                  showTitle={false}
                  showInstructions={false}
                />
              </View>
            </View>

            {/* Exercise Name */}
            <Text style={styles.exerciseName} numberOfLines={2}>
              {exerciseName}
            </Text>

            {/* Motivational Text */}
            <Text style={styles.motivationText}>
              💪 Focus on your form and breathing
            </Text>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, styles.cancelButton]}
                onPress={onCancel}
              >
                <Text style={[styles.controlText, styles.cancelText]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.completeButton]}
                onPress={onComplete}
              >
                <Text style={[styles.controlText, styles.completeText]}>Complete Set</Text>
              </TouchableOpacity>
            </View>

            {/* Progress indicator */}
            <View style={styles.progressDots}>
              {Array.from({ length: totalSets }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < currentSet ? styles.progressDotCompleted : {},
                  ]}
                />
              ))}
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

  sessionCard: {
    width: '90%',
    maxWidth: 400,
    padding: THEME.spacing.xl,
    alignItems: 'center',
  },

  sessionContent: {
    alignItems: 'center',
    width: '100%',
  },

  header: {
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
  },

  setIndicator: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  repsText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },

  animationContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.lg,
    position: 'relative',
  },

  breathingCircleOuter: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: THEME.colors.primary + '20',
    borderWidth: 2,
    borderColor: THEME.colors.primary + '40',
  },

  breathingCircleMiddle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: THEME.colors.primary + '10',
    borderWidth: 1,
    borderColor: THEME.colors.primary + '30',
  },

  exerciseGifContainer: {
    position: 'relative',
    zIndex: 10,
    borderRadius: 90,
    overflow: 'hidden',
    elevation: 4,
  },

  exerciseName: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },

  motivationText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: THEME.spacing.xl,
  },

  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: THEME.spacing.lg,
    gap: THEME.spacing.md,
  },

  controlButton: {
    flex: 1,
    height: 50,
    borderRadius: THEME.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },

  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: THEME.colors.border,
  },

  completeButton: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },

  controlText: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
  },

  cancelText: {
    color: THEME.colors.text,
  },

  completeText: {
    color: THEME.colors.white,
  },

  progressDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THEME.spacing.sm,
  },

  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.border,
  },

  progressDotCompleted: {
    backgroundColor: THEME.colors.primary,
  },
});