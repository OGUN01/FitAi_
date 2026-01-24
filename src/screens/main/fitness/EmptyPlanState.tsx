/**
 * EmptyPlanState Component
 * Beautiful CTA when no weekly workout plan exists
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";

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
              colors={["#667eea", "#764ba2"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <Ionicons name="sparkles" size={rf(40)} color="#fff" />
            </LinearGradient>
            <View style={styles.iconAccent}>
              <Ionicons name="fitness" size={rf(20)} color="#FF6B6B" />
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
                  color="#667eea"
                />
                <Text style={styles.previewText}>
                  {planDetails.workouts} workouts
                </Text>
              </View>
              <View style={styles.previewItem}>
                <Ionicons name="time-outline" size={rf(16)} color="#667eea" />
                <Text style={styles.previewText}>{planDetails.duration}</Text>
              </View>
            </View>

            <View style={styles.previewRow}>
              <View style={styles.previewItem}>
                <Ionicons name="trophy-outline" size={rf(16)} color="#667eea" />
                <Text style={styles.previewText} numberOfLines={1}>
                  {experienceLevel.charAt(0).toUpperCase() +
                    experienceLevel.slice(1)}{" "}
                  level
                </Text>
              </View>
              {primaryGoals.length > 0 && (
                <View style={styles.previewItem}>
                  <Ionicons name="flag-outline" size={rf(16)} color="#667eea" />
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
                  color="#10b981"
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
                isGenerating ? ["#6b7280", "#4b5563"] : ["#667eea", "#764ba2"]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.generateButtonGradient}
            >
              {isGenerating ? (
                <>
                  <Ionicons name="sync" size={rf(20)} color="#fff" />
                  <Text style={styles.generateButtonText}>
                    Finding best exercises for you...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={rf(20)} color="#fff" />
                  <Text style={styles.generateButtonText}>
                    Generate AI Workout
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
    marginBottom: ResponsiveTheme.spacing.lg,
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
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.background,
  },
  title: {
    fontSize: rf(20),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  subtitle: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(20),
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  previewContainer: {
    width: "100%",
    backgroundColor: "rgba(102, 126, 234, 0.08)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  previewTitle: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewRow: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    flex: 1,
  },
  previewText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  featuresContainer: {
    width: "100%",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  featureText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.text,
  },
  generateButton: {
    width: "100%",
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.md + 2,
    paddingHorizontal: ResponsiveTheme.spacing.xl,
  },
  generateButtonText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: "#fff",
  },
});

export default EmptyPlanState;
