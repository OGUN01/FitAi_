/**
 * EmptyPlanState Component
 * Beautiful CTA when no weekly workout plan exists
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../../theme/aurora-tokens";
import { rf, rw, rh } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";

interface EmptyPlanStateProps {
  experienceLevel?: "beginner" | "intermediate" | "advanced";
  primaryGoals?: string[];
  isGenerating: boolean;
  onGeneratePlan: () => void;
}

export const EmptyPlanState: React.FC<EmptyPlanStateProps> = ({
  experienceLevel = "beginner",
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
        false,
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
      case "beginner":
        return { workouts: 3, duration: "1 week" };
      case "intermediate":
        return { workouts: 5, duration: "1.5 weeks" };
      case "advanced":
        return { workouts: 6, duration: "2 weeks" };
      default:
        return { workouts: 3, duration: "1 week" };
    }
  };

  const planDetails = getPlanDetails();

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(500)}>
      <GlassCard
        elevation={3}
        blurIntensity="light"
        padding="xl"
        borderRadius="xl"
      >
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="sparkles" size={rf(40)} color={colors.white} />
            </LinearGradient>
            <View style={styles.iconAccent}>
              <Ionicons name="heart" size={rf(16)} color={colors.primary} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Create Your AI Workout Plan</Text>
          <Text style={styles.subtitle}>
            Generate a personalized weekly workout plan tailored to your fitness
            goals
          </Text>

          {/* Plan Preview */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Based on your profile:</Text>

            <View style={styles.previewRow}>
              <View style={styles.previewItem}>
                <Ionicons
                  name="calendar-outline"
                  size={rf(16)}
                  color={colors.primary}
                />
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
                  {experienceLevel.charAt(0).toUpperCase() +
                    experienceLevel.slice(1)}{" "}
                  level
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
                    {primaryGoals[0].replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            {[
              {
                icon: "checkmark-circle",
                text: "100% GIF video demonstrations",
              },
              {
                icon: "checkmark-circle",
                text: "Exercise validation & safety checks",
              },
              {
                icon: "checkmark-circle",
                text: "AI-optimized for your equipment",
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

          {/* Generate Button */}
          <View style={styles.generateButtonWrapper}>
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
                    <Text style={styles.generateButtonText} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                      Finding best exercises for you...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={rf(20)} color={colors.white} />
                    <Text style={styles.generateButtonText} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.7}>
                      Generate AI Workout
                    </Text>
                  </>
                )}
              </LinearGradient>
            </AnimatedPressable>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  iconWrapper: {
    position: "relative",
    marginBottom: spacing.xl,
    overflow: "visible",
  },
  iconContainer: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(24),
    justifyContent: "center",
    alignItems: "center",
  },
  iconAccent: {
    position: "absolute",
    right: -8,
    bottom: -8,
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: colors.errorTint,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  title: {
    fontSize: rf(20),
    fontWeight: "700",
    color: colors.text,
    textAlign: "left",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: rf(13),
    color: colors.text,
    opacity: 0.75,
    textAlign: "left",
    lineHeight: rf(20),
    paddingHorizontal: 0,
    marginBottom: spacing.lg,
  },
  previewContainer: {
    width: "100%",
    backgroundColor: hexToRgba(colors.primary, 0.08),
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  previewTitle: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
  },
  previewText: {
    fontSize: rf(12),
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  featuresContainer: {
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureText: {
    fontSize: rf(13),
    color: colors.text,
  },
  generateButtonWrapper: {
    width: "100%",
    marginBottom: rh(20),
  },
  generateButton: {
    width: "100%",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    minHeight: 48,
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    minHeight: 48,
  },
  generateButtonText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.white,
  },
});

export default EmptyPlanState;
