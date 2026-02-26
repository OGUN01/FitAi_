import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp } from "../../utils/responsive";
import type { ProgressStats } from "../../services/progressData";

/**
 * ProgressInsights Component
 *
 * Displays motivational insights, tips, and achievements
 * Provides actionable feedback based on user progress
 */

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

const InsightCard: React.FC<{
  insight: InsightItem;
  onAction?: (insight: InsightItem) => void;
}> = ({ insight, onAction }) => {
  const getCardStyle = (type: string, priority: string) => {
    let backgroundColor = ResponsiveTheme.colors.surface;
    let borderColor = ResponsiveTheme.colors.border;

    switch (type) {
      case "achievement":
        backgroundColor = ResponsiveTheme.colors.surface;
        borderColor = ResponsiveTheme.colors.success;
        break;
      case "tip":
        backgroundColor = ResponsiveTheme.colors.surface;
        borderColor = ResponsiveTheme.colors.primary;
        break;
      case "motivation":
        backgroundColor = ResponsiveTheme.colors.surface;
        borderColor = ResponsiveTheme.colors.secondary;
        break;
      case "goal":
        backgroundColor = ResponsiveTheme.colors.surface;
        borderColor = ResponsiveTheme.colors.warning;
        break;
    }

    return {
      backgroundColor,
      borderColor,
      borderWidth: priority === "high" ? 2 : 1,
    };
  };

  return (
    <View
      style={[styles.insightCard, getCardStyle(insight.type, insight.priority)]}
    >
      <View style={styles.insightHeader}>
        <Text style={styles.insightIcon}>{insight.icon}</Text>
        <View style={styles.insightContent}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightMessage}>{insight.message}</Text>
        </View>
      </View>

      {insight.actionText && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onAction?.(insight)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionText}>{insight.actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const generateDefaultInsights = (
  progressStats?: ProgressStats | null,
  workoutStreak?: number,
  nutritionAdherence?: number,
): InsightItem[] => {
  const insights: InsightItem[] = [];

  // If no data is available, return empty array
  if (
    !progressStats &&
    workoutStreak === undefined &&
    nutritionAdherence === undefined
  ) {
    return [];
  }

  // 1. WEIGHT TREND ANALYSIS
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
        icon: isLoss ? "🎯" : "⚠️",
        priority: "high",
        actionText: isLoss ? "View Details" : "Adjust Plan",
      });
    }
  }

  // 2. BODY FAT ANALYSIS
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
        icon: isDecrease ? "💪" : "📊",
        priority: "high",
      });
    }
  }

  // 3. WORKOUT CONSISTENCY
  if (workoutStreak !== undefined) {
    if (workoutStreak >= 7) {
      insights.push({
        id: "workout_streak",
        type: "achievement",
        title: `${workoutStreak} Day Streak!`,
        message: `You've been consistent for ${workoutStreak} days! Consistency is the key to long-term success.`,
        icon: "🔥",
        priority: "high",
        actionText: "Keep Going",
      });
    } else if (workoutStreak >= 3) {
      insights.push({
        id: "workout_streak",
        type: "motivation",
        title: "Building Momentum",
        message: `${workoutStreak} days and counting! Keep pushing forward to build a lasting habit.`,
        icon: "💪",
        priority: "medium",
      });
    } else if (workoutStreak === 0) {
      insights.push({
        id: "workout_restart",
        type: "tip",
        title: "Time to Get Moving",
        message:
          "Every journey starts with a single step. Schedule your next workout today!",
        icon: "🎯",
        priority: "high",
        actionText: "Start Workout",
      });
    }
  }

  // 4. NUTRITION ADHERENCE
  if (nutritionAdherence !== undefined) {
    if (nutritionAdherence >= 80) {
      insights.push({
        id: "nutrition_great",
        type: "achievement",
        title: "Nutrition on Point!",
        message: `${nutritionAdherence.toFixed(0)}% adherence to your nutrition goals. Your diet is fueling your progress!`,
        icon: "🥗",
        priority: "medium",
      });
    } else if (nutritionAdherence >= 50) {
      insights.push({
        id: "nutrition_improve",
        type: "tip",
        title: "Room for Improvement",
        message: `You're at ${nutritionAdherence.toFixed(0)}% nutrition adherence. Try meal prepping to stay on track!`,
        icon: "📋",
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
        icon: "🎯",
        priority: "high",
        actionText: "Set Goals",
      });
    }
  }

  // 5. MUSCLE GAIN ANALYSIS
  if (progressStats?.muscleChange && progressStats.muscleChange.change > 0) {
    insights.push({
      id: "muscle_gain",
      type: "achievement",
      title: "Muscle Growth Detected!",
      message: `You've gained ${progressStats.muscleChange.change.toFixed(1)}kg of muscle mass. Your training is paying off!`,
      icon: "💪",
      priority: "high",
    });
  }

  // 6. GENERAL MOTIVATION
  if (insights.length < 2) {
    insights.push({
      id: "keep_going",
      type: "motivation",
      title: "You're Making Progress",
      message:
        "Every workout, every healthy meal brings you closer to your goals. Stay committed!",
      icon: "🌟",
      priority: "low",
    });
  }

  return insights;
};

export const ProgressInsights: React.FC<ProgressInsightsProps> = ({
  insights,
  onInsightAction,
  progressStats,
  workoutStreak,
  nutritionAdherence,
}) => {
  const displayInsights =
    insights ||
    generateDefaultInsights(progressStats, workoutStreak, nutritionAdherence);

  // Sort by priority (high first) - create copy to avoid mutating original
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

      {/* High Priority Insights */}
      {highPriorityInsights.length > 0 && (
        <View style={styles.prioritySection}>
          {highPriorityInsights.map((insight, index) => (
            <InsightCard
              key={insight.id + '-' + index}
              insight={insight}
              onAction={onInsightAction}
            />
          ))}
        </View>
      )}

      {/* Other Insights */}
      {otherInsights.length > 0 && (
        <View style={styles.regularSection}>
          {otherInsights.slice(0, 3).map((insight, index) => (
            <InsightCard
              key={insight.id + '-' + index}
              insight={insight}
              onAction={onInsightAction}
            />
          ))}
        </View>
      )}

      {/* Motivational Footer */}
      <View style={styles.motivationalFooter}>
        <Text style={styles.footerText}>
          "Success is the sum of small efforts repeated day in and day out."
        </Text>
        <Text style={styles.footerAuthor}>- Robert Collier</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.xxl, // Extra bottom padding for tab bar
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  prioritySection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  regularSection: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  insightCard: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  insightIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
    marginTop: rp(2),
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  insightMessage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.normal,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
  actionButton: {
    alignSelf: "flex-start",
    marginTop: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.xs,
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  actionText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.white,
  },
  motivationalFooter: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    padding: ResponsiveTheme.spacing.lg,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  footerText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  footerAuthor: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.normal,
    color: ResponsiveTheme.colors.textMuted,
  },
});
