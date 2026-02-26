import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Card } from "../../../components/ui";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rbr } from '../../../utils/responsive';

const { width: screenWidth } = Dimensions.get("window");

interface ExerciseAnimationProps {
  gifUrl?: string;
  isPlaying: boolean;
  currentStep: number;
  instructionsCount: number;
  onTogglePlay: () => void;
  onStepChange: (stepIndex: number) => void;
}

export const ExerciseAnimation: React.FC<ExerciseAnimationProps> = ({
  gifUrl,
  isPlaying,
  currentStep,
  instructionsCount,
  onTogglePlay,
  onStepChange,
}) => {
  return (
    <Card style={styles.animationCard}>
      <View style={styles.animationContainer}>
        {gifUrl ? (
          <Image
            source={{ uri: gifUrl }}
            style={styles.exerciseGif}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.animationPlaceholder}>
            <Text style={styles.animationEmoji}>🏋️‍♂️</Text>
            <Text style={styles.animationText}>Exercise Animation</Text>
          </View>
        )}

        {instructionsCount > 1 && (
          <View style={styles.animationControls}>
            <TouchableOpacity style={styles.playButton} onPress={onTogglePlay}>
              <Text style={styles.playButtonText}>
                {isPlaying ? "⏸️" : "▶️"}
              </Text>
            </TouchableOpacity>

            <View style={styles.stepIndicators}>
              {Array.from({ length: instructionsCount }).map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.stepIndicator,
                    currentStep === index && styles.stepIndicatorActive,
                  ]}
                  onPress={() => onStepChange(index)}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  animationCard: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  animationContainer: {
    alignItems: "center",
  },
  exerciseGif: {
    width: screenWidth - 64,
    height: rh(200),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  animationPlaceholder: {
    width: screenWidth - 64,
    height: rh(200),
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  animationEmoji: {
    fontSize: rf(48),
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  animationText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },
  animationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
  },
  playButton: {
    width: rw(48),
    height: rh(48),
    borderRadius: rbr(24),
    backgroundColor: ResponsiveTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonText: {
    fontSize: rf(20),
  },
  stepIndicators: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.xs,
  },
  stepIndicator: {
    width: rw(8),
    height: rh(8),
    borderRadius: rbr(4),
    backgroundColor: ResponsiveTheme.colors.surface,
  },
  stepIndicatorActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
});
