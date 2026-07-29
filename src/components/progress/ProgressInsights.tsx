/**
 * ProgressInsights - Aurora 2026
 *
 * Flat surface.1 insight rows with a small tinted icon squircle + text.
 * Single left accent treatment (plan pattern), no nested card-in-card,
 * no emojis, Manrope type.
 */

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border as borderTokens,
  chart,
  spacing,
  typography,
} from "../../theme/aurora-tokens";
import type { ProgressStats } from "../../services/progressData";
import { haptics } from "../../utils/haptics";

interface InsightItem {
  id: string;
  type: "achievement" | "tip" | "motivation" | "goal";
  title: string;
  message: string;
  icon: string;
  actionText?: string;
  priority: "high" | "medium" | "low";
}

interface ProgressInsightsProps {
  insights?: InsightItem[];
  onInsightAction?: (insight: InsightItem) => void;
  progressStats?: ProgressStats | null;
  workoutStreak?: number;
  nutritionAdherence?: number;
}

const TYPE_META: Record<
  InsightItem["type"],
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  achievement: { icon: "trophy-outline", color: chart[4] },
  tip: { icon: "bulb-outline", color: chart[2] },
  motivation: { icon: "sparkles-outline", color: chart[5] },
  goal: { icon: "flag-outline", color: chart[1] },
};

const InsightRow: React.FC<{
  insight: InsightItem;
  index: number;
  onAction?: (insight: InsightItem) => void;
}> = React.memo(({ insight, index, onAction }) => {
  const meta = TYPE_META[insight.type] ?? TYPE_META.tip;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).duration(280)}
      style={styles.insightCard}
    >
      <View style={styles.insightHeader}>
        <View
          style={[
            styles.insightIconWrap,
            { backgroundColor: `${meta.color}1A` },
          ]}
        >
          <Ionicons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={styles.insightContent}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightMessage}>{insight.message}</Text>
        </View>
      </View>

      {insight.actionText && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            haptics.light();
            onAction?.(insight);
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={insight.actionText}
        >
          <Text style={styles.actionText}>{insight.actionText}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

const generateDefaultInsights = (
  progressStats?: ProgressStats | null,
  workoutStreak?: number,
  nutritionAdherence?: number,
): InsightItem[] => {
  const insights: InsightItem[] = [];

  if (
    !progressStats &&
    workoutStreak === undefined &&
    nutritionAdherence === undefined
  ) {
    return [];
  }

  if (progressStats?.weightChange) {
    const { change, changePercentage } = progressStats.weightChange;

    if (Math.abs(change) > 0.5) {
      const isLoss = change < 0;
      insights.push({
        id: "weight_trend",
        type: isLoss ? "achievement" : "tip",
        title: isLoss ? "Great Progress!" : "Weight Gain Detected",
        message: `You've ${isLoss ? "lost" : "gained"} ${Math.abs(change).toFixed(1)}kg (${Math.abs(changePercentage).toFixed(1)}%). ${
          isLoss
            ? "Keep up the excellent work!"
            : "Review your nutrition plan and ensure it aligns with your goals."
        }`,
        icon: isLoss ? "target" : "warning",
        priority: "high",
        actionText: isLoss ? "View Details" : "Adjust Plan",
      });
    }
  }

  if (
    progressStats?.bodyFatChange &&
    progressStats.bodyFatChange.change !== 0
  ) {
    const { change } = progressStats.bodyFatChange;
    const isDecrease = change < 0;

    if (Math.abs(change) > 0.5) {
      insights.push({
        id: "body_fat_trend",
        type: isDecrease ? "achievement" : "tip",
        title: isDecrease ? "Body Fat Reduced!" : "Body Fat Increased",
        message: `Your body fat ${isDecrease ? "decreased" : "increased"} by ${Math.abs(change).toFixed(1)}%. ${
          isDecrease
            ? "You're building a leaner physique!"
            : "Consider increasing cardio and monitoring your diet."
        }`,
        icon: isDecrease ? "flame" : "analytics",
        priority: "high",
      });
    }
  }

  if (workoutStreak !== undefined) {
    if (workoutStreak >= 7) {
      insights.push({
        id: "workout_streak",
        type: "achievement",
        title: `${workoutStreak} Day Streak!`,
        message: `You've been consistent for ${workoutStreak} days! Consistency is the key to long-term success.`,
        icon: "flame",
        priority: "high",
        actionText: "Keep Going",
      });
    } else if (workoutStreak >= 3) {
      insights.push({
        id: "workout_streak",
        type: "motivation",
        title: "Building Momentum",
        message: `${workoutStreak} days and counting! Keep pushing forward to build a lasting habit.`,
        icon: "trending-up",
        priority: "medium",
      });
    } else if (workoutStreak === 0) {
      insights.push({
        id: "workout_restart",
        type: "tip",
        title: "Time to Get Moving",
        message:
          "Every journey starts with a single step. Schedule your next workout today!",
        icon: "walk",
        priority: "high",
        actionText: "Start Workout",
      });
    }
  }

  if (nutritionAdherence !== undefined) {
    if (nutritionAdherence >= 80) {
      insights.push({
        id: "nutrition_great",
        type: "achievement",
        title: "Nutrition on Point!",
        message: `${nutritionAdherence.toFixed(0)}% adherence to your nutrition goals. Your diet is fueling your progress!`,
        icon: "leaf",
        priority: "medium",
      });
    } else if (nutritionAdherence >= 50) {
      insights.push({
        id: "nutrition_improve",
        type: "tip",
        title: "Room for Improvement",
        message: `You're at ${nutritionAdherence.toFixed(0)}% nutrition adherence. Try meal prepping to stay on track!`,
        icon: "restaurant",
        priority: "medium",
        actionText: "Meal Plan",
      });
    } else {
      insights.push({
        id: "nutrition_focus",
        type: "goal",
        title: "Nutrition Needs Attention",
        message:
          "Your nutrition tracking could use more consistency. Small changes lead to big results!",
        icon: "alert-circle",
        priority: "high",
        actionText: "Set Goals",
      });
    }
  }

  if (progressStats?.muscleChange && progressStats.muscleChange.change > 0) {
    insights.push({
      id: "muscle_gain",
      type: "achievement",
      title: "Muscle Growth Detected!",
      message: `You've gained ${progressStats.muscleChange.change.toFixed(1)}kg of muscle mass. Your training is paying off!`,
      icon: "barbell",
      priority: "high",
    });
  }

  if (insights.length < 2) {
    insights.push({
      id: "keep_going",
      type: "motivation",
      title: "You're Making Progress",
      message:
        "Every workout, every healthy meal brings you closer to your goals. Stay committed!",
      icon: "sparkles",
      priority: "low",
    });
  }

  return insights;
};

export const ProgressInsights: React.FC<ProgressInsightsProps> = React.memo(({
  insights,
  onInsightAction,
  progressStats,
  workoutStreak,
  nutritionAdherence,
}) => {
  const displayInsights =
    insights ||
    generateDefaultInsights(progressStats, workoutStreak, nutritionAdherence);

  const sortedInsights = [...displayInsights].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  const highPriorityInsights = sortedInsights.filter(
    (i) => i.priority === "high",
  );
  const otherInsights = sortedInsights.filter((i) => i.priority !== "high");

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Insights & Tips</Text>

      {highPriorityInsights.map((insight, index) => (
        <InsightRow
          key={insight.id + "-" + index}
          insight={insight}
          index={index}
          onAction={onInsightAction}
        />
      ))}

      {otherInsights.slice(0, 3).map((insight, index) => (
        <InsightRow
          key={insight.id + "-" + index}
          insight={insight}
          index={highPriorityInsights.length + index}
          onAction={onInsightAction}
        />
      ))}

      <View style={styles.motivationalFooter}>
        <Ionicons
          name="chatbubble-outline"
          size={18}
          color={colors.text.muted}
          style={styles.footerIcon}
        />
        <Text style={styles.footerText}>
          "Success is the sum of small efforts repeated day in and day out."
        </Text>
        <Text style={styles.footerAuthor}>- Robert Collier</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  insightCard: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    marginTop: 2,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    marginBottom: spacing.xxs,
  },
  insightMessage: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  actionButton: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    minHeight: 44,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 12,
    justifyContent: "center",
  },
  actionText: {
    ...typography.variants.caption2,
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.primary,
  },
  motivationalFooter: {
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    padding: spacing.lg,
    alignItems: "center",
    marginTop: spacing.md,
  },
  footerIcon: {
    marginBottom: spacing.xs,
  },
  footerText: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: spacing.xs,
  },
  footerAuthor: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
});

export default ProgressInsights;
