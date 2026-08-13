/**
 * ProfileStats - Aurora 2026: 3 equal stat pills separated by thin dividers
 * No individual boxed cards — one clean row on surface.0
 */

import React from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
  chart,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

const { variants } = typography;

interface StatItem {
  id: string;
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface ProfileStatsProps {
  currentStreak: number;
  totalWorkouts: number;
  totalCaloriesBurned: number;
  longestStreak: number;
  achievements: number;
}

function formatValue(value: number | string): string {
  if (typeof value === "number") {
    if (value >= 10000) return `${(value / 1000).toFixed(0)}k`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toString();
  }
  return value;
}

// Stat pills are static info — they previously fired an alert restating the
// number already on the pill, so the pressable was removed rather than kept
// as a dead interaction.
const StatPill: React.FC<{
  stat: StatItem;
  index: number;
  reducedMotion: boolean;
  stacked: boolean;
}> = React.memo(({ stat, index, reducedMotion, stacked }) => {
  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.delay(150 + index * 80).duration(350)
      }
      style={[styles.pillWrapper, stacked && styles.pillWrapperStacked]}
    >
      <View
        style={styles.pill}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${stat.label}: ${formatValue(stat.value)}`}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${stat.color}18` }]}>
          <Ionicons name={stat.icon} size={rf(16)} color={stat.color} />
        </View>
        <Text style={[styles.statValue, { color: stat.color }]} numberOfLines={1}>
          {formatValue(stat.value)}
        </Text>
        <Text style={styles.statLabel} numberOfLines={1}>
          {stat.label}
        </Text>
      </View>
    </Animated.View>
  );
});

export const ProfileStats: React.FC<ProfileStatsProps> = React.memo(({
  currentStreak,
  totalWorkouts,
  totalCaloriesBurned,
  longestStreak: _longestStreak,
  achievements: _achievements,
}) => {
  const reducedMotion = useReducedMotion();
  const { fontScale } = useWindowDimensions();
  const useStackedLayout = fontScale >= 1.3;

  const stats: StatItem[] = [
    {
      id: "current-streak",
      label: "Day Streak",
      value: currentStreak,
      icon: "flame",
      color: chart[1],
    },
    {
      id: "workouts",
      label: "Workouts",
      value: totalWorkouts,
      icon: "barbell",
      color: chart[4],
    },
    {
      id: "calories",
      label: "Calories",
      value: totalCaloriesBurned,
      icon: "flash",
      color: chart[5],
    },
  ];

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(100).duration(350)}
      style={styles.container}
    >
      <View style={[styles.row, useStackedLayout && styles.rowLargeText]}>
        {stats.map((stat, index) => (
          <React.Fragment key={stat.id}>
            <StatPill
              stat={stat}
              index={index}
              reducedMotion={reducedMotion}
              stacked={useStackedLayout}
            />
            {index < stats.length - 1 && (
              <View
                style={[
                  styles.divider,
                  useStackedLayout && styles.dividerLargeText,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLargeText: {
    flexDirection: "column",
  },
  pillWrapper: {
    flex: 1,
  },
  pillWrapperStacked: {
    flex: 0,
    width: "100%",
  },
  pill: {
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  iconWrap: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  statValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(20),
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...variants.caption,
    color: colors.text.secondary,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: "56%",
    backgroundColor: border.DEFAULT,
    alignSelf: "center",
  },
  dividerLargeText: {
    width: "80%",
    height: 1,
  },
});

export default ProfileStats;
