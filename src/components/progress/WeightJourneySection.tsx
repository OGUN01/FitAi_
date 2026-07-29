/**
 * WeightJourneySection - Hero section for Progress screen (Aurora 2026)
 *
 * Full-bleed custom SVG area chart (no boxed card) — gradient fill,
 * smooth bezier curve, animated draw-on. Big current weight + delta chip.
 *
 * DATA SOURCE (single source of truth):
 *  - weightHistory from analyticsDataService.getWeightHistory()
 *    (same source as Analytics tab - analytics_metrics with progress_entries fallback)
 *  - progressEntries kept for guest fallback (no Supabase auth)
 *  - calculatedMetrics.targetWeightKg -> goal weight
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import Animated, { FadeInDown, useAnimatedProps, useSharedValue, withTiming, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { ProgressEntry } from '../../services/progressData';
import type { CalculatedMetrics } from '../../hooks/useCalculatedMetrics';
import {
  surface,
  border as borderTokens,
  chart,
  colors,
  typography,
  spacing,
  borderRadius,
} from '../../theme/aurora-tokens';
import { haptics } from '../../utils/haptics';
import type { WeightUnit } from '../../utils/units';
import { toDisplayWeight } from '../../utils/units';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Period = '1W' | '1M' | '3M' | 'ALL';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: 'ALL', label: 'All', days: Infinity },
];

const CHART_HEIGHT = 180;
const CHART_PADDING_X = 4;
const CHART_PADDING_TOP = 12;
const CHART_PADDING_BOTTOM = 20;
const LINE_COLOR = chart[1];

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

const buildSmoothPath = (
  values: number[],
  width: number,
  height: number,
  padX: number,
  padTop: number,
  padBottom: number,
): { line: string; area: string; lastX: number; lastY: number } => {
  if (values.length < 2) {
    return { line: '', area: '', lastX: 0, lastY: 0 };
  }
  const innerW = width - padX * 2;
  const innerH = height - padTop - padBottom;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const divisor = values.length > 1 ? values.length - 1 : 1;

  const pts = values.map((v, i) => {
    const x = padX + (i / divisor) * innerW;
    const y = padTop + innerH - ((v - min) / range) * innerH;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  });

  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpX = Math.round(((prev.x + curr.x) / 2) * 100) / 100;
    const cpY = Math.round(((prev.y + curr.y) / 2) * 100) / 100;
    line += ` Q ${cpX} ${prev.y}, ${cpX} ${cpY} T ${curr.x} ${curr.y}`;
  }

  const last = pts[pts.length - 1];
  const area = `${line} L ${last.x} ${height - padBottom} L ${pts[0].x} ${height - padBottom} Z`;
  return { line, area, lastX: last.x, lastY: last.y };
};

export const WeightJourneySection: React.FC<WeightJourneySectionProps> = React.memo(({
  weightHistory,
  progressEntries,
  calculatedMetrics,
  onLogWeight,
  unit = 'kg',
}) => {
  const [period, setPeriod] = useState<Period>('1M');
  const cutoffDays = PERIODS.find((item) => item.key === period)?.days ?? 30;
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth - spacing.lg * 2;

  const rawChartData = useMemo((): RawChartPoint[] => {
    const now = Date.now();
    const cutoff = cutoffDays === Infinity ? 0 : now - cutoffDays * 24 * 60 * 60 * 1000;

    const toLabel = (date: Date) =>
      cutoffDays <= 7
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (weightHistory && weightHistory.length > 0) {
      return weightHistory
        .filter((entry) => new Date(entry.date).getTime() >= cutoff)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((entry) => ({ label: toLabel(new Date(entry.date)), valueKg: entry.weight }));
    }

    return progressEntries
      .filter((entry) => entry.weight_kg != null)
      .filter((entry) => new Date(entry.entry_date).getTime() >= cutoff)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime())
      .map((entry) => ({ label: toLabel(new Date(entry.entry_date)), valueKg: entry.weight_kg }));
  }, [cutoffDays, progressEntries, weightHistory]);

  const chartValues = useMemo(
    () => rawChartData.map((entry) => toDisplayWeight(entry.valueKg, unit) ?? 0),
    [rawChartData, unit],
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

  const drawProgress = useSharedValue(0);
  const [drawn, setDrawn] = useState(false);

  React.useEffect(() => {
    drawProgress.value = 0;
    drawProgress.value = withTiming(1, { duration: 900 });
  }, [period, chartValues.length, drawProgress]);

  useAnimatedReaction(
    () => drawProgress.value,
    (value) => {
      if (value >= 1) {
        runOnJS(setDrawn)(true);
      }
    },
    [drawProgress],
  );

  const geom = useMemo(
    () =>
      buildSmoothPath(
        chartValues,
        chartWidth,
        CHART_HEIGHT,
        CHART_PADDING_X,
        CHART_PADDING_TOP,
        CHART_PADDING_BOTTOM,
      ),
    [chartValues, chartWidth],
  );

  const animatedLineProps = useAnimatedProps(() => {
    return {
      strokeDasharray: 1200,
      strokeDashoffset: 1200 * (1 - drawProgress.value),
    } as const;
  });

  const isDown = (totalChangePct ?? 0) <= 0;
  const deltaColor = isDown ? colors.success.DEFAULT : colors.error.DEFAULT;
  const deltaTint = isDown ? `${colors.success.DEFAULT}26` : `${colors.error.DEFAULT}26`;

  const onPeriodPress = (key: Period) => {
    haptics.light();
    setPeriod(key);
  };

  return (
    <Animated.View entering={FadeInDown.delay(0).duration(320)} style={styles.section}>
      {/* Header row */}
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Weight Journey</Text>
        <AnimatedPressable
          style={styles.logButton}
          onPress={() => {
            haptics.light();
            onLogWeight();
          }}
          scaleValue={0.97}
          hapticFeedback={false}
          accessibilityRole="button"
          accessibilityLabel="Log weight"
        >
          <Ionicons name="add" size={16} color={colors.text.primary} />
          <Text style={styles.logButtonText}>Log</Text>
        </AnimatedPressable>
      </View>

      {/* Hero weight + delta chip */}
      <View style={styles.heroRow}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>CURRENT</Text>
          <Text style={styles.heroWeight}>
            {displayCurrentWeight != null ? displayCurrentWeight.toFixed(1) : '—'}
            <Text style={styles.heroUnit}> {unit}</Text>
          </Text>
        </View>
        {totalChangePct != null && (
          <View style={[styles.deltaChip, { backgroundColor: deltaTint }]}>
            <Ionicons
              name={isDown ? 'trending-down' : 'trending-up'}
              size={14}
              color={deltaColor}
            />
            <Text style={[styles.deltaChipText, { color: deltaColor }]}>
              {totalChangePct > 0 ? '+' : ''}
              {totalChangePct.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      {/* Goal hint */}
      {displayTargetWeight != null && displayGoalToGo != null && goalDirection != null && (
        <Text style={styles.goalHint}>
          Goal {displayTargetWeight.toFixed(1)} {unit} · {displayGoalToGo.toFixed(1)} {unit}{' '}
          {goalDirection}
        </Text>
      )}

      {/* Full-bleed chart */}
      <View style={styles.chartWrap}>
        {chartValues.length >= 2 ? (
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Defs>
              <SvgLinearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={LINE_COLOR} stopOpacity={0.28} />
                <Stop offset="1" stopColor={LINE_COLOR} stopOpacity={0} />
              </SvgLinearGradient>
            </Defs>
            {drawn && geom.area !== '' && (
              <Path d={geom.area} fill="url(#weightArea)" />
            )}
            <AnimatedPath
              d={geom.line}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              animatedProps={animatedLineProps}
            />
            <Circle cx={geom.lastX} cy={geom.lastY} r={5} fill={LINE_COLOR} />
            <Circle cx={geom.lastX} cy={geom.lastY} r={9} fill={LINE_COLOR} opacity={0.22} />
          </Svg>
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="stats-chart-outline" size={28} color={colors.text.muted} />
            <Text style={styles.emptyChartText}>Log at least 2 entries to see your journey</Text>
          </View>
        )}
      </View>

      {/* X-axis labels (first / last) */}
      {rawChartData.length >= 2 && (
        <View style={styles.axisRow}>
          <Text style={styles.axisLabel}>{rawChartData[0].label}</Text>
          <Text style={styles.axisLabel}>{rawChartData[rawChartData.length - 1].label}</Text>
        </View>
      )}

      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((item) => {
          const active = period === item.key;
          return (
            <AnimatedPressable
              key={item.key}
              style={[styles.periodTab, active && styles.periodTabActive]}
              onPress={() => onPeriodPress(item.key)}
              scaleValue={0.97}
              hapticFeedback={false}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} period`}
            >
              <Text style={[styles.periodLabel, active && styles.periodLabelActive]}>
                {item.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  logButtonText: {
    ...typography.variants.caption2,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.text.primary,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  heroLeft: {
    flex: 1,
  },
  heroLabel: {
    ...typography.variants.caption,
    fontSize: 11,
    letterSpacing: 1.2,
    color: colors.text.muted,
    marginBottom: spacing.xxs,
  },
  heroWeight: {
    ...typography.variants.heroStat,
    color: colors.text.primary,
  },
  heroUnit: {
    ...typography.variants.cardHeadline,
    fontFamily: 'Manrope_500Medium',
    color: colors.text.secondary,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  deltaChipText: {
    ...typography.variants.caption2,
    fontFamily: 'Manrope_700Bold',
  },
  goalHint: {
    ...typography.variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  chartWrap: {
    marginTop: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xxs,
  },
  axisLabel: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
  emptyChart: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  emptyChartText: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  periodTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    minHeight: 44,
    justifyContent: 'center',
  },
  periodTabActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  periodLabel: {
    ...typography.variants.caption,
    fontFamily: 'Manrope_600SemiBold',
    color: colors.text.muted,
  },
  periodLabelActive: {
    color: colors.text.primary,
  },
});

export default WeightJourneySection;
