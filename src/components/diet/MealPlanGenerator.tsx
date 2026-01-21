/**
 * MealPlanGenerator Component
 * Premium card for generating weekly meal plans
 * Fixes Issue #8 - Clean, single call-to-action for meal plan generation
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../ui/aurora/AuroraSpinner";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";

interface MealPlanGeneratorProps {
  onGenerate: () => void;
  isGenerating: boolean;
  hasPlan?: boolean;
  planName?: string;
  totalMeals?: number;
}

export const MealPlanGenerator: React.FC<MealPlanGeneratorProps> = ({
  onGenerate,
  isGenerating,
  hasPlan,
  planName,
  totalMeals,
}) => {
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(600)}
      style={styles.container}
    >
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={rf(18)} color="#667eea" />
          <Text style={styles.sectionTitle}>AI Meal Planning</Text>
        </View>
        {hasPlan && (
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Active</Text>
          </View>
        )}
      </View>

      <AnimatedPressable
        onPress={onGenerate}
        disabled={isGenerating}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="medium"
      >
        <GlassCard
          elevation={2}
          blurIntensity="default"
          padding="none"
          borderRadius="lg"
        >
          <LinearGradient
            colors={["rgba(102, 126, 234, 0.15)", "rgba(118, 75, 162, 0.1)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
          >
            <View style={styles.content}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                {isGenerating ? (
                  <AuroraSpinner size="md" theme="primary" />
                ) : (
                  <Ionicons name="restaurant" size={rf(32)} color="#667eea" />
                )}
              </View>

              {/* Info */}
              <View style={styles.info}>
                {hasPlan ? (
                  <>
                    <Text style={styles.planName} numberOfLines={1}>
                      {planName || "Weekly Meal Plan"}
                    </Text>
                    <Text style={styles.planDetails}>
                      {totalMeals || 21} meals planned • Tap to regenerate
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.title}>Generate Weekly Plan</Text>
                    <Text style={styles.subtitle}>
                      Get a personalized 7-day meal plan tailored to your goals
                    </Text>
                  </>
                )}
              </View>

              {/* Action Arrow */}
              <View style={styles.arrowContainer}>
                <Ionicons
                  name={isGenerating ? "hourglass-outline" : "chevron-forward"}
                  size={rf(20)}
                  color={ResponsiveTheme.colors.textSecondary}
                />
              </View>
            </View>

            {/* Features List */}
            {!hasPlan && (
              <View style={styles.features}>
                <FeatureTag icon="leaf-outline" text="Diet preferences" />
                <FeatureTag icon="fitness-outline" text="Fitness goals" />
                <FeatureTag icon="timer-outline" text="Prep time" />
              </View>
            )}
          </LinearGradient>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

// Feature Tag Component
const FeatureTag: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}> = ({ icon, text }) => (
  <View style={styles.featureTag}>
    <Ionicons
      name={icon}
      size={rf(12)}
      color={ResponsiveTheme.colors.textSecondary}
    />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: 6,
  },
  activeDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
    backgroundColor: "#4CAF50",
  },
  activeText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: "#4CAF50",
  },
  gradientBg: {
    padding: ResponsiveTheme.spacing.md,
  },
  content: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  iconContainer: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(16),
    backgroundColor: "rgba(102, 126, 234, 0.15)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: ResponsiveTheme.spacing.md,
  },
  info: {
    flex: 1,
  },
  planName: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: 2,
  },
  planDetails: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  title: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
  arrowContainer: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  features: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  featureTag: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    gap: 4,
  },
  featureText: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default MealPlanGenerator;
