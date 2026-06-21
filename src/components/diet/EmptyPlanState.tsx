/**
 * EmptyPlanState Component
 * Beautiful CTA when no weekly workout plan exists
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";

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
              colors={[colors.primary, colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="sparkles" size={rf(40)} color={colors.white} />
            </LinearGradient>
            <View style={styles.iconAccent}>
              <Ionicons name="fitness" size={rf(20)} color={colors.errorLight} />
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
                <Text style={styles.previewText}>
                  {planDetails.workouts} workouts
                </Text>
              </View>
              <View style={styles.previewItem}>
                <Ionicons name="time-outline" size={rf(16)} color={colors.primary} />
                <Text style={styles.previewText}>{planDetails.duration}</Text>
              </View>
            </View>

            <View style={styles.previewRow}>
              <View style={styles.previewItem}>
                <Ionicons name="trophy-outline" size={rf(16)} color={colors.primary} />
                <Text style={styles.previewText} numberOfLines={1}>
                  {experienceLevel.charAt(0).toUpperCase() +
                    experienceLevel.slice(1)}{" "}
                  level
                </Text>
              </View>
              {primaryGoals.length > 0 && (
                <View style={styles.previewItem}>
                  <Ionicons name="flag-outline" size={rf(16)} color={colors.primary} />
                  <Text style={styles.previewText} numberOfLines={1}>
                    {primaryGoals[0]}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Features List */}
          <View style={styles.featuresContainer}>
            {[
              { icon: "checkmark-circle", text: "AI-optimized for your goals" },
              {
                icon: "checkmark-circle",
                text: "Adaptive difficulty progression",
              },
              { icon: "checkmark-circle", text: "Rest days included" },
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons
                  name={feature.icon as keyof typeof Ionicons.glyphMap}
                  size={rf(16)}
                  color={colors.successAlt}
                />
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* Generate Button */}
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
                isGenerating ? [colors.neutral, "#4b5563"] : [colors.primary, colors.primaryLight]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generateButtonGradient}
            >
              {isGenerating ? (
                <>
                  <Ionicons name="sync" size={rf(20)} color={colors.white} />
                  <Text style={styles.generateButtonText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={rf(20)} color={colors.white} />
                  <Text style={styles.generateButtonText}>
                    Generate My Plan
                  </Text>
                </>
              )}
            </LinearGradient>
          </AnimatedPressable>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  iconWrapper: {
    position: "relative",
    marginBottom: spacing.lg,
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
    right: rp(-8),
    bottom: rp(-8),
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: `${colors.errorLight}26`,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  title: {
    fontSize: rf(20),
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: rf(13),
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  previewContainer: {
    width: "100%",
    backgroundColor: `${colors.primary}14`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  previewTitle: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.textSecondary,
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
  generateButton: {
    width: "100%",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
  },
  generateButtonText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.white,
  },
});

export default EmptyPlanState;
