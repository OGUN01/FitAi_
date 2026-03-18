/**
 * WeightJourneySection — Hero section for Progress screen
 *
 * DATA SOURCE (single source of truth):
 *  - weightHistory from analyticsDataService.getWeightHistory()
 *    (same source as Analytics tab — analytics_metrics with progress_entries fallback)
 *  - progressEntries kept for guest fallback (no Supabase auth)
 *  - calculatedMetrics.targetWeightKg → goal weight
 *
 * Features:
 *  - Period tabs: 1W / 1M / 3M / ALL
 *  - Stats bar: avg / min / max / weekly rate
 *  - Goal line indicator
 *  - "Log Weight" CTA
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import { LineChart } from "../../screens/main/analytics/components/LineChart";
import type { ChartData } from "../../screens/main/analytics/components/LineChart";
import type { ProgressEntry } from "../../services/progressData";
import type { CalculatedMetrics } from "../../hooks/useCalculatedMetrics";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rh, rbr, rs } from "../../utils/responsive";

type Period = "1W" | "1M" | "3M" | "ALL";

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: "1W", label: "1W", days: 7 },
  { key: "1M", label: "1M", days: 30 },
  { key: "3M", label: "3M", days: 90 },
  { key: "ALL", label: "All", days: Infinity },
];

interface WeightJourneySectionProps {
  /** Primary source — from analyticsDataService.getWeightHistory (same as Analytics tab) */
  weightHistory?: Array<{ date: string; weight: number }>;
  /** Guest fallback — used when weightHistory is empty (no auth) */
  progressEntries: ProgressEntry[];
  calculatedMetrics: CalculatedMetrics | null;
  onLogWeight: () => void;
}

export const WeightJourneySection: React.FC<WeightJourneySectionProps> = ({
  weightHistory,
  progressEntries,
  calculatedMetrics,
  onLogWeight,
}) => {
  const [period, setPeriod] = useState<Period>("1M");

  const cutoffDays = PERIODS.find((p) => p.key === period)?.days ?? 30;

  const chartData: ChartData[] = useMemo(() => {
    const now = Date.now();
    const cutoff = cutoffDays === Infinity ? 0 : now - cutoffDays * 24 * 60 * 60 * 1000;

    // Prefer weightHistory (analytics source of truth) over progressEntries (guest fallback)
    if (weightHistory && weightHistory.length > 0) {
      return weightHistory
        .filter((e) => new Date(e.date).getTime() >= cutoff)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((e) => {
          const d = new Date(e.date);
          const label =
            cutoffDays <= 7
              ? d.toLocaleDateString("en-US", { weekday: "short" })
              : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return { label, value: e.weight };
        });
    }

    // Guest fallback: use progressEntries
    return progressEntries
      .filter((e) => e.weight_kg != null)
      .filter((e) => new Date(e.entry_date).getTime() >= cutoff)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
      .map((e) => {
        const d = new Date(e.entry_date);
        const label =
          cutoffDays <= 7
            ? d.toLocaleDateString("en-US", { weekday: "short" })
            : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { label, value: e.weight_kg };
      });
  }, [weightHistory, progressEntries, cutoffDays]);

  const targetWeight = calculatedMetrics?.targetWeightKg ?? null;
  const currentWeight = chartData.length > 0 ? chartData[chartData.length - 1].value : null;
  const startWeight = chartData.length > 0 ? chartData[0].value : null;
  const totalChange =
    currentWeight != null && startWeight != null
      ? currentWeight - startWeight
      : null;

  const totalChangePct =
    totalChange != null && startWeight != null && startWeight !== 0
      ? (totalChange / startWeight) * 100
      : null;

  // Extended stats
  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const values = chartData.map((d) => d.value);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    // Weekly rate: (last - first) / (days spanned) * 7
    const weeklyRate =
      totalChange != null && cutoffDays > 0 && cutoffDays !== Infinity
        ? (totalChange / cutoffDays) * 7
        : totalChange != null && chartData.length >= 2 && cutoffDays === Infinity
        ? (() => {
            // Derive actual day span from data
            const oldest = weightHistory
              ? weightHistory[0]?.date
              : progressEntries[0]?.entry_date;
            if (!oldest) return null;
            const span =
              (Date.now() - new Date(oldest).getTime()) / (1000 * 60 * 60 * 24);
            return span > 0 ? (totalChange / span) * 7 : null;
          })()
        : null;
    return { avg, min, max, weeklyRate };
  }, [chartData, totalChange, cutoffDays, weightHistory, progressEntries]);

  const goalToGo =
    currentWeight != null && targetWeight != null
      ? Math.abs(currentWeight - targetWeight)
      : null;
  const goalDirection =
    targetWeight != null && currentWeight != null
      ? currentWeight > targetWeight
        ? "to lose"
        : "to gain"
      : null;

  return (
    <GlassCard style={styles.card}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <LinearGradient
            colors={["rgba(255,107,53,0.25)", "rgba(255,107,53,0.05)"]}
            style={styles.iconBg}
          >
            <Ionicons name="trending-down" size={rf(16)} color={ResponsiveTheme.colors.primary} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>Weight Journey</Text>
        </View>
        <TouchableOpacity style={styles.logButton} onPress={onLogWeight} activeOpacity={0.8}>
          <Ionicons name="add" size={rf(14)} color={ResponsiveTheme.colors.white} />
          <Text style={styles.logButtonText}>Log</Text>
        </TouchableOpacity>
      </View>

      {/* Goal pill */}
      {targetWeight != null && goalToGo != null && goalDirection != null && (
        <View style={styles.goalRow}>
          <Ionicons name="flag-outline" size={rf(12)} color={ResponsiveTheme.colors.primary} />
          <Text style={styles.goalText}>
            Goal: {targetWeight}kg — {goalToGo.toFixed(1)}kg {goalDirection}
          </Text>
        </View>
      )}

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodTab, period === p.key && styles.periodTabActive]}
            onPress={() => setPeriod(p.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.periodLabel, period === p.key && styles.periodLabelActive]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current weight + change badge */}
      <View style={styles.weightRow}>
        <View>
          <Text style={styles.currentLabel}>CURRENT</Text>
          <Text style={styles.currentWeight}>
            {currentWeight != null ? `${currentWeight.toFixed(1)}kg` : "—"}
          </Text>
        </View>
        {totalChangePct != null && (
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor:
                  totalChangePct <= 0
                    ? "rgba(52,199,89,0.15)"
                    : "rgba(255,59,48,0.15)",
              },
            ]}
          >
            <Ionicons
              name={totalChangePct <= 0 ? "trending-down" : "trending-up"}
              size={rf(12)}
              color={
                totalChangePct <= 0
                  ? ResponsiveTheme.colors.success
                  : ResponsiveTheme.colors.error
              }
            />
            <Text
              style={[
                styles.changeBadgeText,
                {
                  color:
                    totalChangePct <= 0
                      ? ResponsiveTheme.colors.success
                      : ResponsiveTheme.colors.error,
                },
              ]}
            >
              {totalChangePct > 0 ? "+" : ""}
              {totalChangePct.toFixed(1)}%
            </Text>
            <Text style={styles.changeBadgeVs}>vs start</Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          color={ResponsiveTheme.colors.primary}
          unit="kg"
          showValues
          showHeader={false}
        />
      </View>


      {/* Stats bar: avg / min / max / weekly rate */}
      {stats && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>AVG</Text>
            <Text style={styles.statValue}>{stats.avg.toFixed(1)} kg</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>MIN</Text>
            <Text style={[styles.statValue, { color: ResponsiveTheme.colors.success }]}>
              {stats.min.toFixed(1)} kg
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>MAX</Text>
            <Text style={[styles.statValue, { color: ResponsiveTheme.colors.error }]}>
              {stats.max.toFixed(1)} kg
            </Text>
          </View>
          {stats.weeklyRate != null && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>/ WEEK</Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        stats.weeklyRate <= 0
                          ? ResponsiveTheme.colors.success
                          : ResponsiveTheme.colors.error,
                    },
                  ]}
                >
                  {stats.weeklyRate > 0 ? "+" : ""}
                  {stats.weeklyRate.toFixed(2)} kg
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </GlassCard>
  );
};

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
    marginBottom: rp(10),
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
  logButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(10),
    paddingVertical: rp(6),
    borderRadius: rbr(12),
  },
  logButtonText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(6),
    marginBottom: rp(10),
    backgroundColor: ResponsiveTheme.colors.primaryTint,
    paddingHorizontal: rp(10),
    paddingVertical: rp(5),
    borderRadius: rbr(10),
    alignSelf: "flex-start",
  },
  goalText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  periodRow: {
    flexDirection: "row",
    gap: rp(6),
    marginBottom: rp(10),
  },
  periodTab: {
    paddingHorizontal: rp(12),
    paddingVertical: rp(5),
    borderRadius: rbr(10),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
  },
  periodTabActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  periodLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textMuted,
  },
  periodLabelActive: {
    color: ResponsiveTheme.colors.white,
  },
  weightRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: rp(4),
  },
  currentLabel: {
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: rp(2),
  },
  currentWeight: {
    fontSize: rf(32),
    fontWeight: "800",
    color: ResponsiveTheme.colors.primary,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(3),
    paddingHorizontal: rp(8),
    paddingVertical: rp(5),
    borderRadius: rbr(10),
    marginBottom: rp(4),
  },
  changeBadgeText: {
    fontSize: rf(12),
    fontWeight: "700",
  },
  changeBadgeVs: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: "500",
  },
  chartWrapper: {
    marginTop: rp(4),
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: rp(12),
    paddingTop: rp(12),
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassBorder,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statLabel: {
    fontSize: rf(9),
    fontWeight: "700",
    color: ResponsiveTheme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: rp(3),
  },
  statValue: {
    fontSize: rf(13),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  statDivider: {
    width: 1,
    height: rh(28),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
  },
});
