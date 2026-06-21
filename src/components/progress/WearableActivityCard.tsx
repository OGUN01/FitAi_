import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp } from "../../utils/responsive";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { GlassCard } from "../../components/ui/aurora/GlassCard";

interface WearableActivityCardProps {
  healthMetrics: any;
}

export const WearableActivityCard: React.FC<WearableActivityCardProps> = ({
  healthMetrics,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Wearable Activity</Text>
      <GlassCard
        style={styles.todaysCard}
        elevation={2}
        blurIntensity="light"
        padding="lg"
        borderRadius="lg"
      >
        <View style={styles.wearableHeader}>
          <Ionicons
            name="watch-outline"
            size={rf(20)}
            color={colors.primary}
          />
          <Text style={styles.wearableLabel}>From your smartwatch</Text>
        </View>
        <View style={styles.todaysStats}>
          {/* Steps */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="walk-outline"
              size={rf(24)}
              color={colors.success}
              style={{
                marginBottom: spacing.xs,
              }}
            />
            <View style={styles.todaysStatContent}>
              <Text style={styles.todaysStatLabel}>Steps</Text>
              <Text style={styles.todaysStatValue}>
                {(healthMetrics?.steps ?? 0).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Active Calories */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="flame-outline"
              size={rf(24)}
              color={colors.warning}
              style={{
                marginBottom: spacing.xs,
              }}
            />
            <View style={styles.todaysStatContent}>
              <Text style={styles.todaysStatLabel}>Burned</Text>
              <Text style={styles.todaysStatValue}>
                {healthMetrics?.activeCalories ?? 0} cal
              </Text>
            </View>
          </View>

          {/* Heart Rate */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="heart-outline"
              size={rf(24)}
              color={colors.error}
              style={{
                marginBottom: spacing.xs,
              }}
            />
            <View style={styles.todaysStatContent}>
              <Text style={styles.todaysStatLabel}>Heart Rate</Text>
              <Text style={styles.todaysStatValue}>
                {healthMetrics.heartRate || "--"} bpm
              </Text>
            </View>
          </View>

          {/* Sleep Hours */}
          {healthMetrics.sleepHours && (
            <View style={styles.todaysStat}>
              <Ionicons
                name="bed-outline"
                size={rf(24)}
                color={colors.primary}
                style={{
                  marginBottom: spacing.xs,
                }}
              />
              <View style={styles.todaysStatContent}>
                <Text style={styles.todaysStatLabel}>Sleep</Text>
                <Text style={styles.todaysStatValue}>
                  {healthMetrics.sleepHours.toFixed(1)}h
                </Text>
              </View>
            </View>
          )}
        </View>
      </GlassCard>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  todaysCard: {
    padding: spacing.lg,
  },
  wearableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  wearableLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  todaysStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  todaysStat: {
    alignItems: "center",
    flex: 1,
  },
  todaysStatContent: {
    alignItems: "center",
  },
  todaysStatLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  todaysStatValue: {
    fontSize: fontSize.md,
    fontWeight: "600",
    color: colors.text,
  },
});
