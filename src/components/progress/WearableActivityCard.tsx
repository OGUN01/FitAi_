/**
 * WearableActivityCard - Aurora 2026
 *
 * Single surface.1 container, icon + stat rows, no drop shadows.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { rf } from "../../utils/responsive";
import {
  colors,
  surface,
  border as borderTokens,
  chart,
  spacing,
  typography,
} from "../../theme/aurora-tokens";

interface WearableActivityCardProps {
  healthMetrics: any;
}

interface StatProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  value: string;
}

const WearableStat: React.FC<StatProps> = ({ icon, color, label, value }) => (
  <View style={styles.stat}>
    <View
      style={[styles.statIconWrap, { backgroundColor: `${color}1A` }]}
    >
      <Ionicons name={icon} size={rf(18)} color={color} />
    </View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

export const WearableActivityCard: React.FC<WearableActivityCardProps> = ({
  healthMetrics,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(120).duration(300)}
      style={styles.section}
    >
      <Text style={styles.sectionTitle}>Wearable Activity</Text>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons
            name="watch-outline"
            size={rf(18)}
            color={colors.primary.DEFAULT}
          />
          <Text style={styles.headerLabel}>From your smartwatch</Text>
        </View>
        <View style={styles.statsRow}>
          <WearableStat
            icon="walk-outline"
            color={chart[4]}
            label="Steps"
            value={(healthMetrics?.steps ?? 0).toLocaleString()}
          />
          <WearableStat
            icon="flame-outline"
            color={chart[5]}
            label="Burned"
            value={`${healthMetrics?.activeCalories ?? 0} cal`}
          />
          <WearableStat
            icon="heart-outline"
            color={chart[1]}
            label="Heart Rate"
            value={`${healthMetrics.heartRate || "--"} bpm`}
          />
          {healthMetrics.sleepHours ? (
            <WearableStat
              icon="bed-outline"
              color={chart[2]}
              label="Sleep"
              value={`${healthMetrics.sleepHours.toFixed(1)}h`}
            />
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  card: {
    padding: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: borderTokens.subtle,
  },
  headerLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginBottom: spacing.xxs,
  },
  statValue: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
  },
});

export default WearableActivityCard;
