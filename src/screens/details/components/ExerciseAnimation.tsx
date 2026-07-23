import React from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Card } from "../../../components/ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { rf, rw, rh, rbr } from '../../../utils/responsive';

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
            <TouchableOpacity
              style={styles.playButton}
              onPress={onTogglePlay}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Pause animation" : "Play animation"}
            >
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
                  hitSlop={{ top: 18, bottom: 18, left: 18, right: 18 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to step ${index + 1}`}
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
    marginBottom: spacing.md,
  },
  animationContainer: {
    alignItems: "center",
    minWidth: 0,
    flexShrink: 1,
  },
  exerciseGif: {
    width: "100%",
    height: rh(200),
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  animationPlaceholder: {
    width: "100%",
    height: rh(200),
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  animationEmoji: {
    fontSize: rf(48),
    marginBottom: spacing.sm,
  },
  animationText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  animationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  playButton: {
    width: rw(48),
    height: rh(48),
    borderRadius: rbr(24),
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonText: {
    fontSize: rf(20),
  },
  stepIndicators: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  stepIndicator: {
    width: rw(8),
    height: rh(8),
    borderRadius: rbr(4),
    backgroundColor: colors.surface,
  },
  stepIndicatorActive: {
    backgroundColor: colors.primary,
  },
});
