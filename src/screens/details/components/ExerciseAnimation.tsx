import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Card, THEME } from "../../../components/ui";

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
    marginBottom: THEME.spacing.md,
  },
  animationContainer: {
    alignItems: "center",
  },
  exerciseGif: {
    width: screenWidth - 64,
    height: 200,
    borderRadius: THEME.borderRadius.lg,
    marginBottom: THEME.spacing.md,
  },
  animationPlaceholder: {
    width: screenWidth - 64,
    height: 200,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: THEME.spacing.md,
  },
  animationEmoji: {
    fontSize: 48,
    marginBottom: THEME.spacing.sm,
  },
  animationText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
  },
  animationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.md,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonText: {
    fontSize: 20,
  },
  stepIndicators: {
    flexDirection: "row",
    gap: THEME.spacing.xs,
  },
  stepIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.surface,
  },
  stepIndicatorActive: {
    backgroundColor: THEME.colors.primary,
  },
});
