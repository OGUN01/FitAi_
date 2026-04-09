/**
 * WorkoutConsistencySection — Calendar heatmap + streak
 *
 * DATA SOURCES (single sources of truth):
 *  - completedSessions (fitnessStore) → workout dates for calendar
 *  - weeklyProgress.streak (DataRetrievalService) → current streak count
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import { useFitnessStore } from "../../stores/fitnessStore";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rh, rbr, rs } from "../../utils/responsive";

const DAYS_SHOWN = 35; // 5 weeks
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface WorkoutConsistencySectionProps {
  streak: number;
}

export const WorkoutConsistencySection: React.FC<WorkoutConsistencySectionProps> = ({
  streak,
}) => {
  const completedSessions = useFitnessStore((s) => s.completedSessions);

  // Build a Set of date strings (YYYY-MM-DD) for all completed sessions
  const workedOutDays = useMemo(() => {
    const set = new Set<string>();
    completedSessions.forEach((s) => {
      const d = new Date(s.completedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      set.add(key);
    });
    return set;
  }, [completedSessions]);

  // Build 35 days ending today, aligned so the grid starts on a Monday
  const cells = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the Monday that starts our 5-week grid
    const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0 … Sun=6
    const gridEnd = new Date(today);
    const gridStart = new Date(today);
    gridStart.setDate(today.getDate() - dayOfWeek - (DAYS_SHOWN - 7)); // go back to cover 5 full weeks

    const result: Array<{ date: Date; key: string; isToday: boolean; worked: boolean }> = [];
    for (let i = 0; i < DAYS_SHOWN; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      result.push({
        date: d,
        key,
        isToday: d.getTime() === today.getTime(),
        worked: workedOutDays.has(key),
      });
    }
    return result;
  }, [workedOutDays]);

  const totalWorkouts = workedOutDays.size;
  const thisWeekWorkouts = cells.filter((c) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return c.date >= monday && c.date <= today && c.worked;
  }).length;

  return (
    <GlassCard style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <LinearGradient
            colors={["rgba(59,130,246,0.25)", "rgba(59,130,246,0.05)"]}
            style={styles.iconBg}
          >
            <Ionicons name="calendar-outline" size={rf(16)} color="#3B82F6" />
          </LinearGradient>
          <Text style={styles.sectionTitle}>Workout Consistency</Text>
        </View>

        {/* Streak badge */}
        {streak > 0 && (
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={rf(13)} color="#F97316" />
            <Text style={styles.streakText}>{streak}d</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{thisWeekWorkouts}</Text>
          <Text style={styles.statLabel}>This week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.min(totalWorkouts, 35)}</Text>
          <Text style={styles.statLabel}>Last 5 weeks</Text>
        </View>
      </View>

      {/* Day labels */}
      <View style={styles.dayLabels}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={styles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar grid — 5 rows × 7 cols */}
      <View style={styles.grid}>
        {cells.map((cell, i) => (
          <View
            key={cell.key}
            style={[
              styles.cell,
              cell.worked ? styles.cellWorked : styles.cellEmpty,
              cell.isToday && styles.cellToday,
            ]}
          >
            {cell.isToday && !cell.worked && (
              <View style={styles.todayDot} />
            )}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotWorked]} />
          <Text style={styles.legendText}>Worked out</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotEmpty]} />
          <Text style={styles.legendText}>Rest day</Text>
        </View>
      </View>
    </GlassCard>
  );
};

const CELL_SIZE = rs(34);
const CELL_GAP = rp(4);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    padding: rp(16),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rp(12),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(8),
  },
  iconBg: {
    width: rs(28),
    height: rs(28),
    borderRadius: rbr(8),
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    backgroundColor: "rgba(249,115,22,0.15)",
    paddingHorizontal: rp(8),
    paddingVertical: rp(4),
    borderRadius: rbr(10),
  },
  streakText: {
    fontSize: rf(12),
    fontWeight: "700",
    color: "#F97316",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginBottom: rp(14),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderRadius: rbr(10),
    paddingVertical: rp(10),
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: rf(20),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
  },
  statLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    marginTop: rp(2),
  },
  statDivider: {
    width: 1,
    height: rh(28),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
  },
  dayLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: rp(4),
    paddingHorizontal: rp(2),
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textMuted,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CELL_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: rbr(6),
    justifyContent: "center",
    alignItems: "center",
  },
  cellEmpty: {
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
  },
  cellWorked: {
    backgroundColor: "#3B82F6",
  },
  cellToday: {
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
    // No backgroundColor here — cellWorked/cellEmpty handles it
  },
  todayDot: {
    width: rp(5),
    height: rp(5),
    borderRadius: rp(3),
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  legend: {
    flexDirection: "row",
    gap: rp(16),
    marginTop: rp(10),
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(5),
  },
  legendDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rbr(3),
  },
  legendDotWorked: {
    backgroundColor: "#3B82F6",
  },
  legendDotEmpty: {
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
  },
  legendText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
  },
});
