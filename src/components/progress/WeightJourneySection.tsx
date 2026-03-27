/**
 * WeightJourneySection - Hero section for Progress screen
 *
 * DATA SOURCE (single source of truth):
 *  - weightHistory from analyticsDataService.getWeightHistory()
 *    (same source as Analytics tab - analytics_metrics with progress_entries fallback)
 *  - progressEntries kept for guest fallback (no Supabase auth)
 *  - calculatedMetrics.targetWeightKg -> goal weight
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassCard } from '../ui/aurora/GlassCard';
import { LineChart, type ChartData } from '../../screens/main/analytics/components/LineChart';
import type { ProgressEntry } from '../../services/progressData';
import type { CalculatedMetrics } from '../../hooks/useCalculatedMetrics';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rp, rh, rbr, rs } from '../../utils/responsive';
import { type WeightUnit, toDisplayWeight } from '../../utils/units';

type Period = '1W' | '1M' | '3M' | 'ALL';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: 'ALL', label: 'All', days: Infinity },
];

interface WeightJourneySectionProps {
  weightHistory?: Array<{ date: string; weight: number }>;
  progressEntries: ProgressEntry[];
  calculatedMetrics: CalculatedMetrics | null;
  onLogWeight: () => void;
  unit?: WeightUnit;
}

interface RawChartPoint {
  label: string;
  valueKg: number;
}

export const WeightJourneySection: React.FC<WeightJourneySectionProps> = React.memo(({
  weightHistory,
  progressEntries,
  calculatedMetrics,
  onLogWeight,
  unit = 'kg',
}) => {
  const [period, setPeriod] = useState<Period>('1M');
  const cutoffDays = PERIODS.find((item) => item.key === period)?.days ?? 30;

  const rawChartData = useMemo((): RawChartPoint[] => {
    const now = Date.now();
    const cutoff = cutoffDays === Infinity ? 0 : now - cutoffDays * 24 * 60 * 60 * 1000;

    if (weightHistory && weightHistory.length > 0) {
      return weightHistory
        .filter((entry) => new Date(entry.date).getTime() >= cutoff)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((entry) => {
          const date = new Date(entry.date);
          const label =
            cutoffDays <= 7
              ? date.toLocaleDateString('en-US', { weekday: 'short' })
              : date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                });
          return { label, valueKg: entry.weight };
        });
    }

    return progressEntries
      .filter((entry) => entry.weight_kg != null)
      .filter((entry) => new Date(entry.entry_date).getTime() >= cutoff)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
      .map((entry) => {
        const date = new Date(entry.entry_date);
        const label =
          cutoffDays <= 7
            ? date.toLocaleDateString('en-US', { weekday: 'short' })
            : date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
        return { label, valueKg: entry.weight_kg };
      });
  }, [cutoffDays, progressEntries, weightHistory]);

  const chartData: ChartData[] = useMemo(
    () =>
      rawChartData.map((entry) => ({
        label: entry.label,
        value: toDisplayWeight(entry.valueKg, unit) ?? 0,
      })),
    [rawChartData, unit]
  );

  const currentWeightKg =
    rawChartData.length > 0 ? rawChartData[rawChartData.length - 1].valueKg : null;
  const startWeightKg = rawChartData.length > 0 ? rawChartData[0].valueKg : null;
  const targetWeightKg = calculatedMetrics?.targetWeightKg ?? null;

  const totalChangeKg =
    currentWeightKg != null && startWeightKg != null ? currentWeightKg - startWeightKg : null;
  const totalChangePct =
    totalChangeKg != null && startWeightKg != null && startWeightKg !== 0
      ? (totalChangeKg / startWeightKg) * 100
      : null;

  const stats = useMemo(() => {
    if (rawChartData.length < 2) {
      return null;
    }

    const values = rawChartData.map((entry) => entry.valueKg);
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    const weeklyRateKg =
      totalChangeKg != null && cutoffDays > 0 && cutoffDays !== Infinity
        ? (totalChangeKg / cutoffDays) * 7
        : totalChangeKg != null && cutoffDays === Infinity
          ? (() => {
              const oldestDate = weightHistory?.[0]?.date ?? progressEntries[0]?.entry_date;
              if (!oldestDate) {
                return null;
              }

              const spanDays =
                (Date.now() - new Date(oldestDate).getTime()) / (1000 * 60 * 60 * 24);
              return spanDays > 0 ? (totalChangeKg / spanDays) * 7 : null;
            })()
          : null;

    return { avg, min, max, weeklyRateKg };
  }, [cutoffDays, progressEntries, rawChartData, totalChangeKg, weightHistory]);

  const goalToGoKg =
    currentWeightKg != null && targetWeightKg != null
      ? Math.abs(currentWeightKg - targetWeightKg)
      : null;
  const goalDirection =
    currentWeightKg != null && targetWeightKg != null
      ? currentWeightKg > targetWeightKg
        ? 'to lose'
        : 'to gain'
      : null;

  const displayCurrentWeight = toDisplayWeight(currentWeightKg, unit);
  const displayTargetWeight = toDisplayWeight(targetWeightKg, unit);
  const displayGoalToGo = toDisplayWeight(goalToGoKg, unit);
  const displayStats = stats
    ? {
        avg: toDisplayWeight(stats.avg, unit),
        min: toDisplayWeight(stats.min, unit),
        max: toDisplayWeight(stats.max, unit),
        weeklyRate: toDisplayWeight(stats.weeklyRateKg, unit),
      }
    : null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <LinearGradient
            colors={['rgba(255,107,53,0.25)', 'rgba(255,107,53,0.05)']}
            style={styles.iconBg}
          >
            <Ionicons name="trending-down" size={rf(16)} color={ResponsiveTheme.colors.primary} />
          </LinearGradient>
          <Text style={styles.sectionTitle}>Weight Journey</Text>
        </View>
        <TouchableOpacity
          style={styles.logButton}
          onPress={onLogWeight}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Log weight"
        >
          <Ionicons name="add" size={rf(14)} color={ResponsiveTheme.colors.white} />
          <Text style={styles.logButtonText}>Log</Text>
        </TouchableOpacity>
      </View>

      {displayTargetWeight != null && displayGoalToGo != null && goalDirection != null && (
        <View style={styles.goalRow}>
          <Ionicons name="flag-outline" size={rf(12)} color={ResponsiveTheme.colors.primary} />
          <Text style={styles.goalText}>
            Goal: {displayTargetWeight.toFixed(1)} {unit} - {displayGoalToGo.toFixed(1)} {unit}{' '}
            {goalDirection}
          </Text>
        </View>
      )}

      <View style={styles.periodRow}>
        {PERIODS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.periodTab, period === item.key && styles.periodTabActive]}
            onPress={() => setPeriod(item.key)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} period`}
          >
            <Text style={[styles.periodLabel, period === item.key && styles.periodLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.weightRow}>
        <View>
          <Text style={styles.currentLabel}>CURRENT</Text>
          <Text style={styles.currentWeight}>
            {displayCurrentWeight != null ? `${displayCurrentWeight.toFixed(1)} ${unit}` : '—'}
          </Text>
        </View>
        {totalChangePct != null && (
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor:
                  totalChangePct <= 0 ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)',
              },
            ]}
          >
            <Ionicons
              name={totalChangePct <= 0 ? 'trending-down' : 'trending-up'}
              size={rf(12)}
              color={
                totalChangePct <= 0 ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.error
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
              {totalChangePct > 0 ? '+' : ''}
              {totalChangePct.toFixed(1)}%
            </Text>
            <Text style={styles.changeBadgeVs}>vs start</Text>
          </View>
        )}
      </View>

      <View style={styles.chartWrapper}>
        <LineChart
          data={chartData}
          color={ResponsiveTheme.colors.primary}
          unit={unit}
          showValues
          showHeader={false}
        />
      </View>

      {stats && displayStats && (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>AVG</Text>
            <Text style={styles.statValue}>
              {displayStats.avg?.toFixed(1)} {unit}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>MIN</Text>
            <Text style={[styles.statValue, { color: ResponsiveTheme.colors.success }]}>
              {displayStats.min?.toFixed(1)} {unit}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>MAX</Text>
            <Text style={[styles.statValue, { color: ResponsiveTheme.colors.error }]}>
              {displayStats.max?.toFixed(1)} {unit}
            </Text>
          </View>
          {stats.weeklyRateKg != null && displayStats.weeklyRate != null && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>/ WEEK</Text>
                <Text
                  style={[
                    styles.statValue,
                    {
                      color:
                        stats.weeklyRateKg <= 0
                          ? ResponsiveTheme.colors.success
                          : ResponsiveTheme.colors.error,
                    },
                  ]}
                >
                  {stats.weeklyRateKg > 0 ? '+' : ''}
                  {displayStats.weeklyRate.toFixed(2)} {unit}
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </GlassCard>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.md,
    padding: rp(16),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: rp(10),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(8),
  },
  iconBg: {
    width: rs(28),
    height: rs(28),
    borderRadius: rbr(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(4),
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(10),
    paddingVertical: rp(6),
    borderRadius: rbr(12),
    minHeight: 44,
    justifyContent: 'center',
  },
  logButtonText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.white,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(6),
    marginBottom: rp(10),
    backgroundColor: ResponsiveTheme.colors.primaryTint,
    paddingHorizontal: rp(10),
    paddingVertical: rp(5),
    borderRadius: rbr(10),
    alignSelf: 'flex-start',
  },
  goalText: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.primary,
  },
  periodRow: {
    flexDirection: 'row',
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
    minHeight: 44,
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  periodLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textMuted,
  },
  periodLabelActive: {
    color: ResponsiveTheme.colors.white,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: rp(4),
  },
  currentLabel: {
    fontSize: rf(10),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: rp(2),
  },
  currentWeight: {
    fontSize: rf(32),
    fontWeight: '800',
    color: ResponsiveTheme.colors.primary,
  },
  changeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rp(3),
    paddingHorizontal: rp(8),
    paddingVertical: rp(5),
    borderRadius: rbr(10),
    marginBottom: rp(4),
  },
  changeBadgeText: {
    fontSize: rf(12),
    fontWeight: '700',
  },
  changeBadgeVs: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    fontWeight: '500',
  },
  chartWrapper: {
    marginTop: rp(4),
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: rp(12),
    paddingTop: rp(12),
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: rf(9),
    fontWeight: '700',
    color: ResponsiveTheme.colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: rp(3),
  },
  statValue: {
    fontSize: rf(13),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  statDivider: {
    width: 1,
    height: rh(28),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
  },
});
