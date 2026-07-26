/**
 * MyWorkoutsCard Component
 *
 * Glass summary card surfacing the user's all-time workout library stats:
 * total completed sessions, saved templates, total duration, total calories.
 *
 * Replaces the previous simple "My Workouts →" pressable button on the
 * Fitness tab. Tapping the card (or the "View All" link) navigates to
 * TemplateLibrary — preserving the legacy `template-library-button` testID.
 *
 * Data sources (read-only — this is a pure presentation component):
 *  - Workouts / Total Duration / Total Calories → derived locally via useMemo
 *    from the store's `completedSessions` array (all sessions, every week,
 *    planned + extra). We subscribe to the stable array reference rather than
 *    calling the `getAllTimeWorkoutStats()` selector, because Zustand v5 uses
 *    Object.is snapshot equality — a selector returning a fresh object literal
 *    on every call triggers an infinite re-render loop.
 *  - Templates count → workoutTemplateService.getTemplates(userId), loaded
 *    once on mount via useEffect and stored in local state.
 */

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf, rw, rh, rp } from "../../../utils/responsive";
import { useFitnessStore } from "../../../stores/fitnessStore";
import { workoutTemplateService } from "../../../services/workoutTemplateService";
import { getCurrentUserId } from "../../../services/authUtils";

interface MyWorkoutsCardProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

/**
 * Format a duration in minutes as a compact "Xh Ym" string.
 * - 0 → "0m"
 * - 45 → "45m"
 * - 75 → "1h 15m"
 * - 600 → "10h 0m"
 *
 * Kept local to this card because no existing util formats minutes this way
 * (utils/exerciseDuration.formatDuration formats seconds as M:SS, and
 * utils/mealSchedule.formatMinutesToTime returns a clock time like "7:30 AM").
 */
const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours <= 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

/**
 * Format an integer with thousands separators (e.g. 4380 → "4,380").
 * Uses `toLocaleString` so the grouping follows the device locale.
 */
const formatThousands = (value: number): string => {
  if (!value || value <= 0) return "0";
  return Math.round(value).toLocaleString("en-US");
};

export const MyWorkoutsCard: React.FC<MyWorkoutsCardProps> = ({ navigation }) => {
  // Subscribe to the stable `completedSessions` array reference (only changes
  // when a session is added/removed) and derive all-time totals with useMemo.
  // NEVER pass a selector returning a fresh object literal to useFitnessStore —
  // that defeats Zustand's Object.is snapshot equality and causes an infinite
  // re-render loop ("getSnapshot should be cached").
  const completedSessions = useFitnessStore((s) => s.completedSessions);

  const stats = useMemo(() => {
    return {
      count: completedSessions.length,
      totalCalories: completedSessions.reduce(
        (sum, s) => sum + s.caloriesBurned,
        0,
      ),
      totalDuration: completedSessions.reduce(
        (sum, s) => sum + s.durationMinutes,
        0,
      ),
    };
  }, [completedSessions]);

  // Templates count loaded async on mount. "-" while loading.
  const [templateCount, setTemplateCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const userId = getCurrentUserId();
    if (!userId) {
      // No authenticated user yet — show 0 rather than a stuck loading state.
      setTemplateCount(0);
      return;
    }
    workoutTemplateService
      .getTemplates(userId)
      .then((templates) => {
        if (!cancelled) setTemplateCount(templates.length);
      })
      .catch(() => {
        // Service already logs the Supabase error; just surface a safe value.
        if (!cancelled) setTemplateCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleViewAll = () => navigation.navigate("TemplateLibrary");

  return (
    <Animated.View entering={FadeInDown.delay(250).duration(400)}>
      <AnimatedPressable
        onPress={handleViewAll}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="light"
        accessibilityRole="button"
        accessibilityLabel="My workouts library"
        accessibilityHint="Double tap to view your workout templates"
        testID="template-library-button"
      >
        <GlassCard
          elevation={2}
          blurIntensity="light"
          padding="none"
          borderRadius="xl"
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons
                  name="barbell-outline"
                  size={rf(16)}
                  color={colors.primary}
                />
                <Text style={styles.title} numberOfLines={1}>My Workouts</Text>
              </View>
              <View style={styles.viewAll}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons
                  name="arrow-forward"
                  size={rf(13)}
                  color={colors.primary}
                />
              </View>
            </View>

            {/* 2x2 stat grid — two rows of two tiles, each row splits 50/50 */}
            <View style={styles.grid}>
              <View style={styles.gridRow}>
                <StatTile
                  icon="checkmark-done-outline"
                  value={String(stats.count)}
                  label="Workouts"
                  tint={colors.primary}
                />
                <StatTile
                  icon="library-outline"
                  value={templateCount === null ? "-" : String(templateCount)}
                  label="Templates"
                  tint={colors.secondary}
                />
              </View>
              <View style={styles.gridRow}>
                <StatTile
                  icon="time-outline"
                  value={formatDuration(stats.totalDuration)}
                  label="Total Duration"
                  tint={colors.successAlt}
                />
                <StatTile
                  icon="flame-outline"
                  value={formatThousands(stats.totalCalories)}
                  label="kcal"
                  tint={colors.warningAlt}
                />
              </View>
            </View>
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

interface StatTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tint: string;
}

const StatTile: React.FC<StatTileProps> = ({ icon, value, label, tint }) => (
  <View style={styles.statTile}>
    <View style={[styles.statIcon, { backgroundColor: `${tint}1F` }]}>
      <Ionicons name={icon} size={rf(15)} color={tint} />
    </View>
    <Text
      style={styles.statValue}
      numberOfLines={1}
      adjustsFontSizeToFit={true}
      minimumFontScale={0.7}
    >
      {value}
    </Text>
    <Text style={styles.statLabel} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.text,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(2),
    minHeight: 44,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: colors.primary,
  },
  grid: {
    gap: spacing.sm,
  },
  gridRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statTile: {
    flex: 1,
    backgroundColor: colors.glassSurface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statIcon: {
    width: rw(30),
    height: rw(30),
    borderRadius: rw(15),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: rf(18),
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
});

export default MyWorkoutsCard;
