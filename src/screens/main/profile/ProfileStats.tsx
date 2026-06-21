/**
 * ProfileStats - Compact Stats Grid
 *
 * World-class design:
 * - Horizontal scrollable row (edge-to-edge)
 * - Includes Day Streak (moved from header)
 * - Compact, elegant stat cards
 * - Smooth entry animations
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../../theme/aurora-tokens";
import { rf, rw, rp } from '../../../utils/responsive';
import { haptics } from "../../../utils/haptics";

interface StatItem {
  id: string;
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  gradientColors: [string, string];
  suffix?: string;
}

interface ProfileStatsProps {
  currentStreak: number;
  totalWorkouts: number;
  totalCaloriesBurned: number;
  longestStreak: number;
  achievements: number;
  onStatPress?: (statId: string) => void;
}

const StatCard: React.FC<{
  stat: StatItem;
  index: number;
  onPress?: () => void;
}> = ({ stat, index, onPress }) => {
  const formatValue = (value: number | string): string => {
    if (typeof value === "number") {
      if (value >= 10000) return `${(value / 1000).toFixed(0)}k`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
      return value.toString();
    }
    return value;
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(100 + index * 80).duration(400)}
      style={styles.statCardWrapper}
    >
      <AnimatedPressable
        onPress={() => {
          haptics.light();
          onPress?.();
        }}
        scaleValue={0.95}
        hapticFeedback={false}
      >
        <LinearGradient
          colors={[`${stat.color}15`, `${stat.color}08`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.statCard, { borderColor: `${stat.color}35` }]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${stat.color}20` },
            ]}
          >
            <Ionicons name={stat.icon} size={rf(20)} color={stat.color} />
          </View>

          {/* Value */}
          <Text style={[styles.statValue, { color: stat.color }]}>
            {formatValue(stat.value)}
            {stat.suffix && (
              <Text style={styles.statSuffix}>{stat.suffix}</Text>
            )}
          </Text>

          {/* Label */}
          <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {stat.label}
          </Text>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  currentStreak,
  totalWorkouts,
  totalCaloriesBurned,
  longestStreak,
  achievements,
  onStatPress,
}) => {
  const stats: StatItem[] = [
    {
      id: 'current-streak',
      label: 'Day Streak',
      value: currentStreak,
      icon: 'flame',
      color: colors.errorLight,
      gradientColors: [colors.errorLight, colors.errorAlt],
    },
    {
      id: 'workouts',
      label: 'Workouts',
      value: totalWorkouts,
      icon: 'barbell',
      color: colors.successAlt,
      gradientColors: [colors.successAlt, colors.successAltDark],
    },
    {
      id: 'calories',
      label: 'Calories',
      value: totalCaloriesBurned,
      icon: 'flash',
      color: colors.amber,
      gradientColors: [colors.amber, colors.warningAlt],
    },
    {
      id: 'best-streak',
      label: 'Best Streak',
      value: longestStreak,
      icon: 'trophy',
      color: colors.primary,
      gradientColors: [colors.primary, colors.primaryDark],
    },
    {
      id: 'achievements',
      label: 'Achievements',
      value: achievements,
      icon: 'ribbon',
      color: colors.gold,
      gradientColors: [colors.gold, colors.amberBright],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <StatCard
            key={stat.id}
            stat={stat}
            index={index}
            onPress={() => onStatPress?.(stat.id)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: rp(spacing.lg),
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: rp(spacing.sm),
  },
  statCardWrapper: {
    width: "31.5%",
  },
  statCard: {
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  iconContainer: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: rf(20),
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: rp(2),
  },
  statSuffix: {
    fontSize: rf(12),
    fontWeight: "600",
  },
  statLabel: {
    fontSize: rf(10),
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    flexShrink: 1,
  },
});

export default ProfileStats;
