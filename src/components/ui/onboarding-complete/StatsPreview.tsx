import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AnimatedRN, { FadeInUp } from "react-native-reanimated";
import { flatColors as colors, spacing, borderRadius, typography } from "../../../theme/aurora-tokens";
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
                { backgroundColor: colors.errorTint },
              ]}
            >
              <Ionicons name="flag" size={rf(18)} color={colors.errorLight} />
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
                { backgroundColor: colors.primaryTint },
              ]}
            >
              <Ionicons name="barbell" size={rf(18)} color={colors.primary} />
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
                { backgroundColor: colors.successTint },
              ]}
            >
              <Ionicons name="flame" size={rf(18)} color={colors.successAlt} />
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
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: spacing.xs,
  },
  statItem: {
    flex: 1,
    minWidth: rp(70),
    maxWidth: rp(100),
    alignItems: "center",
    backgroundColor: colors.glassSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  statIcon: {
    width: rp(32),
    height: rp(32),
    borderRadius: rbr(16),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: rf(10),
    color: colors.textSecondary,
    marginBottom: rp(2),
  },
  statValue: {
    fontSize: rf(10),
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
  },
});
