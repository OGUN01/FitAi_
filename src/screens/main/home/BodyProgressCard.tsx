/**
 * BodyProgressCard Component
 * Weight trend visualization with goal countdown
 *
 * Features:
 * - Mini weight trend graph (7-day)
 * - Goal progress indicator
 * - Photo comparison shortcut
 * - Trend analysis
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";
import { useBodyProgressLogic, WeightEntry } from "./useBodyProgressLogic";
import { TrendChart } from "./components/TrendChart";
import { GoalProgressBar } from "./components/GoalProgressBar";

interface BodyProgressCardProps {
  currentWeight?: number; // in kg or lbs
  goalWeight?: number;
  startingWeight?: number;
  weightHistory?: WeightEntry[];
  unit?: "kg" | "lbs";
  onPress?: () => void;
  onPhotoPress?: () => void;
  onLogWeight?: () => void;
}

export const BodyProgressCard: React.FC<BodyProgressCardProps> = ({
  currentWeight,
  goalWeight,
  startingWeight,
  weightHistory = [],
  unit = "kg",
  onPress,
  onPhotoPress,
  onLogWeight,
}) => {
  const { progress, remaining, trendInfo, chartData, hasData, progressColor } =
    useBodyProgressLogic({
      currentWeight,
      goalWeight,
      startingWeight,
      weightHistory,
    });

  return (
    <View>
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        {/* Header */}
        <Pressable
          onPress={onPress}
          accessibilityRole="none"
          style={styles.headerPressable}
        >
          <View style={styles.headerLeft}>
            <Ionicons name="body" size={rf(16)} color={ResponsiveTheme.colors.primary} />
            <Text style={styles.headerTitle}>Body Progress</Text>
          </View>
          {hasData && (
            <View
              style={[
                styles.trendBadge,
                { backgroundColor: `${trendInfo.color}20` },
              ]}
            >
              <Ionicons
                name={trendInfo.icon}
                size={rf(12)}
                color={trendInfo.color}
              />
              <Text style={[styles.trendText, { color: trendInfo.color }]}>
                {trendInfo.label}
              </Text>
            </View>
          )}
        </Pressable>

        {hasData ? (
          <>
            {/* Main Stats */}
            <View style={styles.mainStats}>
              <View style={styles.currentWeight}>
                <Text style={styles.weightValue}>
                  {currentWeight?.toFixed(1)}
                  <Text style={styles.weightUnit}> {unit}</Text>
                </Text>
                <Text style={styles.weightLabel}>Current</Text>
              </View>

              {/* Mini Chart */}
              <View style={styles.chartContainer}>
                <TrendChart
                  data={
                    chartData.length >= 2
                      ? chartData
                      : currentWeight
                        ? [currentWeight, currentWeight]
                        : []
                  }
                  width={rw(120)}
                  height={rh(50)}
                  color={ResponsiveTheme.colors.primary}
                />
              </View>

              <View style={styles.goalWeight}>
                <Text style={styles.goalValue}>
                  {goalWeight ? goalWeight.toFixed(1) : "—"}
                  <Text style={styles.goalUnit}> {unit}</Text>
                </Text>
                <Text style={styles.goalLabel}>Goal</Text>
              </View>
            </View>

            {/* Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  {goalWeight ? "Goal Progress" : "Body Progress"}
                </Text>
                <Text
                  style={[styles.progressPercent, { color: progressColor }]}
                >
                  {goalWeight ? `${progress.toFixed(0)}%` : ""}
                </Text>
              </View>
              <GoalProgressBar progress={progress} color={progressColor} />
              <Text style={styles.remainingText}>
                {!goalWeight
                  ? "Set a goal weight"
                  : remaining > 0
                  ? `${remaining.toFixed(1)} ${unit} to go`
                  : "🎉 Goal reached!"}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <AnimatedPressable
                onPress={onLogWeight}
                scaleValue={0.95}
                hapticFeedback={true}
                hapticType="light"
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel="Log weight"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={rf(16)}
                  color={ResponsiveTheme.colors.primary}
                />
                <Text style={styles.actionButtonText}>Log Weight</Text>
              </AnimatedPressable>

              <View style={styles.actionDivider} />

              <AnimatedPressable
                onPress={onPhotoPress}
                scaleValue={0.95}
                hapticFeedback={true}
                hapticType="light"
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel="Progress photo"
              >
                <Ionicons name="camera-outline" size={rf(16)} color={ResponsiveTheme.colors.primary} />
                <Text style={styles.actionButtonText}>Progress Photo</Text>
              </AnimatedPressable>
            </View>
          </>
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="scale-outline" size={rf(32)} color={ResponsiveTheme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Track Your Progress</Text>
            <Text style={styles.emptyDescription}>
              Log your weight to see trends and track your fitness journey
            </Text>
            <AnimatedPressable
              onPress={onLogWeight}
              scaleValue={0.95}
              hapticFeedback={true}
              hapticType="medium"
              style={styles.startButton}
              accessibilityRole="button"
              accessibilityLabel="Log first weight"
            >
              <Ionicons name="add" size={rf(16)} color={ResponsiveTheme.colors.white} />
              <Text style={styles.startButtonText}>Log First Weight</Text>
            </AnimatedPressable>
          </View>
        )}
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  headerPressable: {
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
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: ResponsiveTheme.spacing.xs,
  },
  trendText: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  mainStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  currentWeight: {
    alignItems: "flex-start",
  },
  weightValue: {
    fontSize: rf(24),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
  },
  weightUnit: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  weightLabel: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  chartContainer: {
    flex: 1,
    alignItems: "center",
  },
  goalWeight: {
    alignItems: "flex-end",
  },
  goalValue: {
    fontSize: rf(18),
    fontWeight: "700",
    color: ResponsiveTheme.colors.textSecondary,
  },
  goalUnit: {
    fontSize: rf(12),
    fontWeight: "500",
  },
  goalLabel: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  progressSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  progressLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  progressPercent: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  remainingText: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassBorder,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.xs,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },
  actionButtonText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  actionDivider: {
    width: 1,
    height: rh(20),
    backgroundColor: ResponsiveTheme.colors.glassHighlight,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  emptyIconContainer: {
    width: rw(60),
    height: rw(60),
    borderRadius: rw(30),
    backgroundColor: "rgba(156, 39, 176, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  emptyDescription: {
    fontSize: rf(12),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  startButtonText: {
    fontSize: rf(13),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
  },
});

export default BodyProgressCard;
