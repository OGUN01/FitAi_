import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedRN, { FadeInUp } from "react-native-reanimated";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf } from "../../../utils/responsive";

interface StatsPreviewProps {
  stats?: {
    workoutsPerWeek?: number;
    calorieTarget?: number;
    goal?: string;
  };
}

export const StatsPreview: React.FC<StatsPreviewProps> = ({ stats }) => {
  if (!stats) return null;

  return (
    <AnimatedRN.View
      entering={FadeInUp.delay(600).duration(400)}
      style={styles.statsContainer}
    >
      <View style={styles.statsRow}>
        {stats.goal && (
          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "rgba(255, 107, 107, 0.15)" },
              ]}
            >
              <Ionicons name="flag" size={rf(18)} color="#FF6B6B" />
            </View>
            <Text style={styles.statLabel}>Goal</Text>
            <Text style={styles.statValue} numberOfLines={1}>
              {stats.goal}
            </Text>
          </View>
        )}
        {stats.workoutsPerWeek && (
          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "rgba(102, 126, 234, 0.15)" },
              ]}
            >
              <Ionicons name="barbell" size={rf(18)} color="#667eea" />
            </View>
            <Text style={styles.statLabel}>Weekly</Text>
            <Text style={styles.statValue}>
              {stats.workoutsPerWeek} workouts
            </Text>
          </View>
        )}
        {stats.calorieTarget && (
          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "rgba(16, 185, 129, 0.15)" },
              ]}
            >
              <Ionicons name="flame" size={rf(18)} color="#10b981" />
            </View>
            <Text style={styles.statLabel}>Target</Text>
            <Text style={styles.statValue}>{stats.calorieTarget} cal</Text>
          </View>
        )}
      </View>
    </AnimatedRN.View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: ResponsiveTheme.spacing.xs,
  },
  statItem: {
    flex: 1,
    minWidth: 70,
    maxWidth: 100,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  statLabel: {
    fontSize: 10,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 10,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
});
