/**
 * EmptyPlanState Component
 * Flat, centered empty-state hero shown when no weekly workout plan exists.
 * 2026 redesign: no boxed card — large tinted icon disc, bold title, muted
 * subtitle, flat profile-preview rows, and one full-width gradient CTA.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing, borderRadius } from '../../../theme/aurora-tokens';
import { rf, rw, rp } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';

interface EmptyPlanStateProps {
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
  primaryGoals?: string[];
  isGenerating: boolean;
  onGeneratePlan: () => void;
}

export const EmptyPlanState: React.FC<EmptyPlanStateProps> = ({
  experienceLevel = 'beginner',
  primaryGoals = [],
  isGenerating,
  onGeneratePlan,
}) => {
  // Spin the sync icon while generating — gives progressive feedback instead
  // of a static icon next to "Finding best exercises for you...".
  const rotation = useSharedValue(0);
  useEffect(() => {
    if (isGenerating) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [isGenerating, rotation]);
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getPlanDetails = () => {
    switch (experienceLevel) {
      case 'beginner':
        return { workouts: 3, duration: '1 week' };
      case 'intermediate':
        return { workouts: 5, duration: '1.5 weeks' };
      case 'advanced':
        return { workouts: 6, duration: '2 weeks' };
      default:
        return { workouts: 3, duration: '1 week' };
    }
  };

  const planDetails = getPlanDetails();

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.container}>
      {/* Icon — large tinted disc */}
      <View style={styles.iconDisc}>
        <Ionicons name="sparkles" size={rf(48)} color={colors.primary} />
      </View>

      {/* Title + subtitle */}
      <Text style={styles.title}>Create Your AI Workout Plan</Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        Generate a personalized weekly workout plan tailored to your fitness goals
      </Text>

      {/* Plan Preview — flat rows, no box */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewTitle}>Based on your profile</Text>

        <View style={styles.previewRow}>
          <View style={styles.previewItem}>
            <Ionicons name="calendar-outline" size={rf(16)} color={colors.primary} />
            <Text
              style={styles.previewText}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {planDetails.workouts} workouts
            </Text>
          </View>
          <View style={styles.previewItem}>
            <Ionicons name="time-outline" size={rf(16)} color={colors.primary} />
            <Text
              style={styles.previewText}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {planDetails.duration}
            </Text>
          </View>
        </View>

        <View style={styles.previewRow}>
          <View style={styles.previewItem}>
            <Ionicons name="trophy-outline" size={rf(16)} color={colors.primary} />
            <Text
              style={styles.previewText}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.7}
            >
              {experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)} level
            </Text>
          </View>
          {primaryGoals.length > 0 && (
            <View style={styles.previewItem}>
              <Ionicons name="flag-outline" size={rf(16)} color={colors.primary} />
              <Text
                style={styles.previewText}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                {primaryGoals[0]
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c: string) => c.toUpperCase())}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Features List — flat */}
      <View style={styles.featuresContainer}>
        {[
          {
            icon: 'checkmark-circle',
            text: '100% GIF video demonstrations',
          },
          {
            icon: 'checkmark-circle',
            text: 'Exercise validation & safety checks',
          },
          {
            icon: 'checkmark-circle',
            text: 'AI-optimized for your equipment',
          },
        ].map((feature, index) => (
          <View key={index} style={styles.featureItem}>
            <Ionicons
              name={feature.icon as keyof typeof Ionicons.glyphMap}
              size={rf(16)}
              color={colors.primary}
            />
            <Text style={styles.featureText}>{feature.text}</Text>
          </View>
        ))}
      </View>

      {/* Generate Button — full-width gradient CTA */}
      <AnimatedPressable
        onPress={onGeneratePlan}
        scaleValue={0.96}
        hapticFeedback={true}
        hapticType="medium"
        disabled={isGenerating}
        style={styles.generateButton}
      >
        <LinearGradient
          colors={
            isGenerating ? [colors.muted, colors.neutral] : [colors.primary, colors.primaryDark]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.generateButtonGradient}
        >
          {isGenerating ? (
            <>
              <Animated.View style={spinStyle}>
                <Ionicons name="sync" size={rf(20)} color={colors.white} />
              </Animated.View>
              <Text
                style={styles.generateButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                Finding best exercises for you...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="sparkles" size={rf(20)} color={colors.white} />
              <Text
                style={styles.generateButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.7}
              >
                Generate AI Workout
              </Text>
            </>
          )}
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    paddingVertical: rp(spacing.xl),
  },
  iconDisc: {
    width: rw(96),
    height: rw(96),
    borderRadius: rw(48),
    backgroundColor: hexToRgba(colors.primary, 0.12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: rf(22),
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: rf(14),
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: rf(20),
    marginBottom: spacing.xl,
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  previewTitle: {
    fontSize: rf(11),
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  previewText: {
    fontSize: rf(12),
    color: colors.text,
    flexShrink: 1,
    minWidth: 0,
  },
  featuresContainer: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: rf(12),
    color: colors.textTertiary,
  },
  generateButton: {
    width: '100%',
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    minHeight: 52,
  },
  generateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 52,
  },
  generateButtonText: {
    fontSize: rf(15),
    fontWeight: '700',
    color: colors.white,
  },
});

export default EmptyPlanState;
