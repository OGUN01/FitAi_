import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedRN, { FadeInUp } from "react-native-reanimated";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp, rbr } from "../../../utils/responsive";

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
                { backgroundColor: ResponsiveTheme.colors.errorTint },
              ]}
            >
              <Ionicons name="flag" size={rf(18)} color={ResponsiveTheme.colors.errorLight} />
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
                { backgroundColor: ResponsiveTheme.colors.primaryTint },
              ]}
            >
              <Ionicons name="barbell" size={rf(18)} color={ResponsiveTheme.colors.primary} />
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
                { backgroundColor: ResponsiveTheme.colors.successTint },
              ]}
            >
              <Ionicons name="flame" size={rf(18)} color={ResponsiveTheme.colors.successAlt} />
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
    minWidth: rp(70),
    maxWidth: rp(100),
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  statIcon: {
    width: rp(32),
    height: rp(32),
    borderRadius: rbr(16),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  statLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(2),
  },
  statValue: {
    fontSize: rf(10),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
  },
});
