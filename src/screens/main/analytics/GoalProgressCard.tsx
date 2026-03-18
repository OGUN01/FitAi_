import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rbr } from "../../../utils/responsive";
import { CalculatedMetrics } from "../../../hooks/useCalculatedMetrics";
// SSOT: use onboarding types (the actual data format used by profileStore)
import type { PersonalInfoData, BodyAnalysisData } from "../../../types/onboarding";

interface GoalProgressCardProps {
  calculatedMetrics: CalculatedMetrics | null;
  /** SSOT: from profileStore.personalInfo (onboarding_data table) */
  profilePersonalInfo?: PersonalInfoData | null;
  /** SSOT: from profileStore.bodyAnalysis (body_analysis table) */
  bodyAnalysis?: BodyAnalysisData | null;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  calculatedMetrics,
  profilePersonalInfo: _profilePersonalInfo,
  bodyAnalysis: _bodyAnalysis,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(400).duration(400)}
      style={styles.trendCard}
    >
      <View style={styles.trendHeader}>
        <View
          style={[styles.trendIconContainer, { backgroundColor: ResponsiveTheme.colors.primaryTint }]}
        >
          <Ionicons name="flag-outline" size={rf(20)} color={ResponsiveTheme.colors.primary} />
        </View>
        <Text style={styles.trendTitle}>Goal Progress</Text>
      </View>

      <View style={styles.goalContainer}>
        {calculatedMetrics?.targetWeightKg != null &&
          calculatedMetrics?.currentWeightKg != null && (
            <View style={styles.goalItem}>
              <Text style={styles.goalLabel}>Weight Goal</Text>
              <View style={styles.goalProgressBar}>
                <View
                  style={[
                    styles.goalProgressFill,
                    {
                      width: "0%",
                      backgroundColor: ResponsiveTheme.colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.goalText}>
                {calculatedMetrics.currentWeightKg > 0
                  ? `${calculatedMetrics.currentWeightKg.toFixed(1)} kg → ${calculatedMetrics.targetWeightKg.toFixed(1)} kg`
                  : "— kg → — kg"}
              </Text>
            </View>
          )}

        {calculatedMetrics?.dailyCalories != null && calculatedMetrics.dailyCalories > 0 && (
          <View style={styles.goalItem}>
            <Text style={styles.goalLabel}>Daily Calorie Target</Text>
            <Text style={styles.goalValue}>
              {calculatedMetrics.dailyCalories.toLocaleString()} kcal/day
            </Text>
          </View>
        )}

        {(calculatedMetrics?.targetWeightKg == null ||
          calculatedMetrics?.targetWeightKg === 0) &&
          (calculatedMetrics?.dailyCalories == null ||
            calculatedMetrics?.dailyCalories === 0) && (
          <View style={styles.emptyState}>
            <Ionicons
              name="compass-outline"
              size={rf(28)}
              color={ResponsiveTheme.colors.textSecondary}
            />
            <Text style={styles.emptyStateValue}>—</Text>
            <Text style={styles.emptyStateText}>
              Set goals in Profile to track progress
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  trendCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: rw(16),
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(12),
  },
  trendIconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rbr(10),
    alignItems: "center",
    justifyContent: "center",
    marginRight: rw(12),
  },
  trendTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  goalContainer: {
    gap: rh(12),
  },
  goalItem: {
    gap: rh(6),
  },
  goalLabel: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
  },
  goalProgressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: rbr(4),
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: rbr(4),
  },
  goalText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.text,
  },
  goalValue: {
    fontSize: rf(18),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rh(16),
    gap: rh(8),
  },
  emptyStateValue: {
    fontSize: rf(28),
    fontWeight: "700",
    color: ResponsiveTheme.colors.textSecondary,
  },
  emptyStateText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },
});
