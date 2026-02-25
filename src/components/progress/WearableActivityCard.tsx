import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { rf, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
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
            color={ResponsiveTheme.colors.primary}
          />
          <Text style={styles.wearableLabel}>From your smartwatch</Text>
        </View>
        <View style={styles.todaysStats}>
          {/* Steps */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="walk-outline"
              size={rf(24)}
              color="#4CAF50"
              style={{
                marginBottom: ResponsiveTheme.spacing.xs,
              }}
            />
            <View style={styles.todaysStatContent}>
              <Text style={styles.todaysStatLabel}>Steps</Text>
              <Text style={styles.todaysStatValue}>
                {healthMetrics.steps.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Active Calories */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="flame-outline"
              size={rf(24)}
              color="#FF9800"
              style={{
                marginBottom: ResponsiveTheme.spacing.xs,
              }}
            />
            <View style={styles.todaysStatContent}>
              <Text style={styles.todaysStatLabel}>Burned</Text>
              <Text style={styles.todaysStatValue}>
                {healthMetrics.activeCalories} cal
              </Text>
            </View>
          </View>

          {/* Heart Rate */}
          <View style={styles.todaysStat}>
            <Ionicons
              name="heart-outline"
              size={rf(24)}
              color="#F44336"
              style={{
                marginBottom: ResponsiveTheme.spacing.xs,
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
                color="#FF6B35"
                style={{
                  marginBottom: ResponsiveTheme.spacing.xs,
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  todaysCard: {
    padding: ResponsiveTheme.spacing.lg,
  },
  wearableHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
    marginBottom: ResponsiveTheme.spacing.md,
    paddingBottom: ResponsiveTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  wearableLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
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
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  todaysStatValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
});
