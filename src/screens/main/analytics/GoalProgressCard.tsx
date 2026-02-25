import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";
import { CalculatedMetrics } from "../../../hooks/useCalculatedMetrics";
import { UserProfile } from "../../../types/user";

interface GoalProgressCardProps {
  calculatedMetrics: CalculatedMetrics | null;
  profile: UserProfile | null;
}

export const GoalProgressCard: React.FC<GoalProgressCardProps> = ({
  calculatedMetrics,
  profile,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(400).duration(400)}
      style={styles.trendCard}
    >
      <View style={styles.trendHeader}>
        <View
          style={[styles.trendIconContainer, { backgroundColor: "#FF6B3520" }]}
        >
          <Ionicons name="flag-outline" size={20} color="#FF6B35" />
        </View>
        <Text style={styles.trendTitle}>Goal Progress</Text>
      </View>

      <View style={styles.goalContainer}>
        {calculatedMetrics?.targetWeightKg &&
          profile?.bodyMetrics?.current_weight_kg &&
          calculatedMetrics?.currentWeightKg && (
            <View style={styles.goalItem}>
              <Text style={styles.goalLabel}>Weight Goal</Text>
              <View style={styles.goalProgressBar}>
                <View
                  style={[
                    styles.goalProgressFill,
                    {
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          ((calculatedMetrics.currentWeightKg -
                            profile.bodyMetrics.current_weight_kg) /
                            (calculatedMetrics.currentWeightKg -
                              calculatedMetrics.targetWeightKg)) *
                            100,
                        ),
                      )}%`,
                      backgroundColor: "#FF6B35",
                    },
                  ]}
                />
              </View>
              <Text style={styles.goalText}>
                {profile.bodyMetrics.current_weight_kg.toFixed(1)} kg →{" "}
                {calculatedMetrics.targetWeightKg.toFixed(1)} kg
              </Text>
            </View>
          )}

        {calculatedMetrics?.dailyCalories && (
          <View style={styles.goalItem}>
            <Text style={styles.goalLabel}>Daily Calorie Target</Text>
            <Text style={styles.goalValue}>
              {calculatedMetrics.dailyCalories.toLocaleString()} kcal/day
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
    borderRadius: 16,
    padding: rw(16),
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(12),
  },
  trendIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
    height: 8,
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: 4,
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
});
