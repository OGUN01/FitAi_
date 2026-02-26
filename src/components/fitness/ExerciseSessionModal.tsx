import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from "react-native";
import { Card, Button } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rw, rh, rs } from "../../utils/responsive";
import { ExerciseGifPlayer } from "./ExerciseGifPlayer";

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
        ]),
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
        ]),
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
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
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
                <Text style={[styles.controlText, styles.cancelText]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.controlButton, styles.completeButton]}
                onPress={onComplete}
              >
                <Text style={[styles.controlText, styles.completeText]}>
                  Complete Set
                </Text>
              </TouchableOpacity>
            </View>

            {/* Progress indicator */}
            <View style={styles.progressDots}>
              {Array.from({ length: totalSets }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < currentSet - 1 ? styles.progressDotCompleted : {},
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  sessionCard: {
    width: "90%",
    maxWidth: 400,
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center",
  },

  sessionContent: {
    alignItems: "center",
    width: "100%",
  },

  header: {
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  setIndicator: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  repsText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },

  animationContainer: {
    width: rw(250),
    height: rh(250),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    position: "relative",
  },

  breathingCircleOuter: {
    position: "absolute",
    width: rw(250),
    height: rh(250),
    borderRadius: rbr(125),
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary + "40",
  },

  breathingCircleMiddle: {
    position: "absolute",
    width: rw(220),
    height: rh(220),
    borderRadius: rbr(110),
    backgroundColor: ResponsiveTheme.colors.primary + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "30",
  },

  exerciseGifContainer: {
    position: "relative",
    zIndex: 10,
    borderRadius: rbr(90),
    overflow: "hidden",
    elevation: 4,
  },

  exerciseName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  motivationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: ResponsiveTheme.spacing.xl,
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },

  controlButton: {
    flex: 1,
    height: rh(50),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },

  cancelButton: {
    backgroundColor: "transparent",
    borderColor: ResponsiveTheme.colors.border,
  },

  completeButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  controlText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  cancelText: {
    color: ResponsiveTheme.colors.text,
  },

  completeText: {
    color: ResponsiveTheme.colors.white,
  },

  progressDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
  },

  progressDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rbr(5),
    backgroundColor: ResponsiveTheme.colors.border,
  },

  progressDotCompleted: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
});
