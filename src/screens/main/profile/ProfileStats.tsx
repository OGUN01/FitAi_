/**
 * ProfileStats - Aurora 2026: 3 equal stat pills separated by thin dividers
 * No individual boxed cards — one clean row on surface.0
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
  chart,
} from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

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
  onStatPress?: (statId: string) => void;
}

function formatValue(value: number | string): string {
  if (typeof value === "number") {
    if (value >= 10000) return `${(value / 1000).toFixed(0)}k`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
    return value.toString();
  }
  return value;
}

const StatPill: React.FC<{
  stat: StatItem;
  index: number;
  onPress?: () => void;
}> = React.memo(({ stat, index, onPress }) => {
  const handlePress = useCallback(() => {
    haptics.light();
    onPress?.();
  }, [onPress]);

  return (
    <Animated.View
      entering={FadeInDown.delay(150 + index * 80).duration(350)}
      style={styles.pillWrapper}
    >
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${stat.label}: ${formatValue(stat.value)}`}
        style={({ pressed }) => [
          styles.pill,
          pressed && styles.pillPressed,
        ]}
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
      </Pressable>
    </Animated.View>
  );
});

export const ProfileStats: React.FC<ProfileStatsProps> = React.memo(({
  currentStreak,
  totalWorkouts,
  totalCaloriesBurned,
  longestStreak,
  achievements,
  onStatPress,
}) => {
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

  const handleStatPress = useCallback(
    (id: string) => {
      onStatPress?.(id);
    },
    [onStatPress],
  );

  return (
    <Animated.View
      entering={FadeInDown.delay(100).duration(350)}
      style={styles.container}
    >
      <View style={styles.row}>
        {stats.map((stat, index) => (
          <React.Fragment key={stat.id}>
            <StatPill
              stat={stat}
              index={index}
              onPress={() => handleStatPress(stat.id)}
            />
            {index < stats.length - 1 && <View style={styles.divider} />}
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  pillWrapper: {
    flex: 1,
  },
  pill: {
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
  },
  pillPressed: {
    opacity: 0.7,
  },
  iconWrap: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  statValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(20),
    letterSpacing: -0.5,
    marginBottom: spacing.xxs,
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
});

export default ProfileStats;
