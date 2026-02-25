/**
 * HealthIntelligenceHub Component
 * World-class health metrics dashboard inspired by Apple Health & Oura Ring
 *
 * Features:
 * - Recovery Score (composite metric)
 * - Resting Heart Rate with trend
 * - Sleep Quality visualization
 * - Activity readiness indicator
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";
import { useHealthIntelligenceLogic } from "../../../hooks/useHealthIntelligenceLogic";
import { RecoveryRing } from "../../../components/home/RecoveryRing";
import { MetricItem } from "../../../components/home/MetricItem";
import { HealthIntelligencePlaceholder } from "../../../components/home/HealthIntelligencePlaceholder";

interface HealthIntelligenceHubProps {
  // Recovery metrics
  sleepHours?: number;
  sleepQuality?: "poor" | "fair" | "good" | "excellent";
  restingHeartRate?: number;
  hrTrend?: "up" | "down" | "stable";
  steps?: number;
  stepsGoal?: number;
  activeCalories?: number;

  // User data for calculations
  age?: number;

  onPress?: () => void;
  onDetailPress?: (metric: string) => void;
}

export const HealthIntelligenceHub: React.FC<HealthIntelligenceHubProps> = ({
  sleepHours,
  sleepQuality,
  restingHeartRate,
  hrTrend,
  steps,
  stepsGoal,
  activeCalories,
  age,
  onPress,
  onDetailPress,
}) => {
  const {
    hasRealData,
    recoveryScore,
    recoveryLabel,
    recoveryColor,
    sleepColor,
    formatSleepQuality,
    insightText,
  } = useHealthIntelligenceLogic({
    sleepHours,
    sleepQuality,
    restingHeartRate,
    steps,
    stepsGoal,
    activeCalories,
  });

  const ringSize = rw(100);

  if (!hasRealData) {
    return <HealthIntelligencePlaceholder onPress={onPress} />;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
    >
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="pulse"
              size={rf(16)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.headerTitle}>Health Intelligence</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${recoveryColor}20` },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: recoveryColor }]}
            />
            <Text style={[styles.statusText, { color: recoveryColor }]}>
              {recoveryLabel}
            </Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Recovery Ring */}
          <RecoveryRing score={recoveryScore ?? 0} size={ringSize} />

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <MetricItem
              icon="heart"
              label="Resting HR"
              value={restingHeartRate ? `${restingHeartRate}` : "--"}
              subvalue="bpm"
              color="#FF6B6B"
              trend={hrTrend}
              onPress={() => onDetailPress?.("heart")}
              delay={100}
            />
            <MetricItem
              icon="moon"
              label="Sleep"
              value={
                sleepHours && sleepHours > 0 ? `${sleepHours.toFixed(1)}` : "--"
              }
              subvalue="hrs"
              color="#FF6B35"
              onPress={() => onDetailPress?.("sleep")}
              delay={200}
            />
            <MetricItem
              icon="fitness"
              label="Quality"
              value={formatSleepQuality(sleepQuality)}
              color={sleepColor}
              onPress={() => onDetailPress?.("quality")}
              delay={300}
            />
          </View>
        </View>

        {/* Bottom Insight */}
        <View style={styles.insightContainer}>
          <Ionicons
            name="bulb-outline"
            size={rf(14)}
            color={ResponsiveTheme.colors.primary}
          />
          <Text style={styles.insightText}>{insightText}</Text>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: ResponsiveTheme.spacing.xs,
  },
  statusDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
  },
  metricsGrid: {
    flex: 1,
    gap: ResponsiveTheme.spacing.sm,
  },
  insightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  insightText: {
    flex: 1,
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
});

export default HealthIntelligenceHub;
