/**
 * ExerciseAnimation — hero media zone for the exercise detail screen.
 *
 * Full-width dark media surface at the top of the scroll content. The GIF
 * (or placeholder) fills the zone; playback controls live in a bottom scrim
 * bar so they stay legible over any frame of the animation.
 *
 * All stepping/playback logic is owned by the parent (useStepAnimation) —
 * this component is presentational only. Props, a11y labels, hit slops, and
 * haptics are unchanged from the previous implementation.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { colors, spacing, borderRadius, typography } from '../../../theme/aurora-tokens';
import { hexToRgba } from '../../../utils/colors';
import { rf, rw, rh, rbr, rp } from '../../../utils/responsive';

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
    <View style={styles.hero}>
      <View style={styles.mediaZone}>
        {gifUrl ? (
          <Image source={{ uri: gifUrl }} style={styles.exerciseGif} resizeMode="contain" />
        ) : (
          <View style={styles.animationPlaceholder}>
            <View style={styles.placeholderIconWrap}>
              <Ionicons name="barbell-outline" size={rf(28)} color={colors.text.tertiary} />
            </View>
            <Text style={styles.animationText}>Exercise Animation</Text>
          </View>
        )}

        {instructionsCount > 1 && (
          <View style={styles.controlsBar}>
            <AnimatedPressable
              style={styles.playButton}
              onPress={onTogglePlay}
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause animation' : 'Play animation'}
              scaleValue={0.9}
              springConfig="snappy"
              hapticType="light"
            >
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={rf(20)}
                color={colors.text.primary}
              />
            </AnimatedPressable>

            <View style={styles.stepIndicators}>
              {Array.from({ length: instructionsCount }).map((_, index) => (
                <AnimatedPressable
                  key={index}
                  style={[
                    styles.stepIndicator,
                    currentStep === index && styles.stepIndicatorActive,
                  ]}
                  onPress={() => onStepChange(index)}
                  hitSlop={{ top: 18, bottom: 18, left: 18, right: 18 }}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to step ${index + 1}`}
                  scaleValue={0.95}
                  springConfig="snappy"
                  hapticType="light"
                >
                  {null}
                </AnimatedPressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    marginBottom: rp(spacing.lg),
  },
  mediaZone: {
    width: '100%',
    height: rh(260),
    borderRadius: rbr(borderRadius.xl),
    backgroundColor: colors.background.tertiary,
    borderWidth: 1,
    borderColor: colors.glass.border,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseGif: {
    width: '100%',
    height: '100%',
  },
  animationPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.sm),
  },
  placeholderIconWrap: {
    width: rw(64),
    height: rw(64),
    borderRadius: rbr(borderRadius.full),
    backgroundColor: colors.glass.backgroundDark,
    borderWidth: 1,
    borderColor: colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.tertiary,
    letterSpacing: 0.4,
  },
  // Dark scrim bar pinned to the bottom of the media zone so the controls
  // stay legible over light GIF frames.
  controlsBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rp(spacing.md),
    paddingVertical: rp(spacing.sm),
    backgroundColor: hexToRgba(colors.aurora.space.base, 0.72),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.glass.border,
  },
  playButton: {
    width: rw(48),
    height: rh(48),
    borderRadius: rbr(24),
    backgroundColor: colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(spacing.xs),
  },
  stepIndicator: {
    width: rw(8),
    height: rh(8),
    borderRadius: rbr(4),
    backgroundColor: colors.glass.backgroundLight,
  },
  stepIndicatorActive: {
    backgroundColor: colors.primary.DEFAULT,
    width: rw(20),
  },
});
