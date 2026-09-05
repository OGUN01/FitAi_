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
import { SlidingSegmentedControl } from '../ui/aurora/SlidingSegmentedControl';
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from 'react-native-svg';
import Animated, { FadeInDown, useAnimatedProps, useSharedValue, withTiming, useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { ProgressEntry } from '../../services/progressData';
import {
  surface,
  border as borderTokens,
  chart,
  colors,
  typography,
  spacing,
  borderRadius,
  errorText,
} from '../../theme/aurora-tokens';
import { haptics } from '../../utils/haptics';
import type { WeightUnit } from '../../utils/units';
import { toDisplayWeight } from '../../utils/units';
import { mergeWeightSeries } from './goalProgressUtils';
import { useReducedMotion } from '../../utils/accessibility/hooks';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Period = '1W' | '1M' | '3M' | 'ALL';

const PERIODS: { key: Period; label: string; days: number }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: 'ALL', label: 'All', days: Infinity },
];

const CHART_HEIGHT = 180;
// 12px (not 4): the end-point marker is a 5r dot + 9r halo drawn at the last
// x — with 4px padding the halo was clipped by the SVG's right edge.
const CHART_PADDING_X = 12;
const CHART_PADDING_TOP = 12;
const CHART_PADDING_BOTTOM = 20;
const LINE_COLOR = chart[1];
// Draw-on dash length for the line path (see animatedLineProps below).
const DASH_LENGTH = 1200;

interface WeightJourneySectionProps {
  weightHistory?: Array<{ date: string; weight: number }>;
  progressEntries: ProgressEntry[];
  onLogWeight: () => void;
  unit?: WeightUnit;
  /**
   * Onboarding-derived current weight (calculatedMetrics.currentWeightKg).
   * Hero-only fallback so a fresh user who just entered their weight sees it
   * instead of "—" before any weigh-in is logged (matches AnalyticsScreen's
   * resolveCurrentWeight fallback). Never seeds chart data.
   */
  fallbackCurrentWeightKg?: number | null;
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
  onLogWeight,
  unit = 'kg',
  fallbackCurrentWeightKg = null,
}) => {
  const reducedMotion = useReducedMotion();
  const [period, setPeriod] = useState<Period>('1M');
  const cutoffDays = PERIODS.find((item) => item.key === period)?.days ?? 30;
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth - spacing.lg * 2;

  // Merged per-day series from both sources (analytics history + local entries)
  // so a same-day log never collapses the chart to a single point.
  const mergedSeries = useMemo(
    () => mergeWeightSeries(weightHistory, progressEntries),
    [weightHistory, progressEntries],
  );

  const rawChartData = useMemo((): RawChartPoint[] => {
    const now = Date.now();
    const cutoff = cutoffDays === Infinity ? 0 : now - cutoffDays * 24 * 60 * 60 * 1000;

    const toLabel = (date: Date) =>
      cutoffDays <= 7
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return mergedSeries
      .filter((entry) => new Date(entry.date).getTime() >= cutoff)
      .map((entry) => ({ label: toLabel(new Date(entry.date)), valueKg: entry.weight }));
  }, [cutoffDays, mergedSeries]);

  const chartValues = useMemo(
    () => rawChartData.map((entry) => toDisplayWeight(entry.valueKg, unit) ?? 0),
    [rawChartData, unit],
  );

  // Hero current weight comes from the UNFILTERED latest entry (SSOT) — the
  // period-filtered chart data can be empty for 1W/1M even when older
  // weightHistory exists, and the hero must not blank out in that case.
  const latestWeightKg = useMemo((): number | null => {
    return mergedSeries.length > 0
      ? mergedSeries[mergedSeries.length - 1].weight
      : null;
  }, [mergedSeries]);

  const hasAnyWeightData = latestWeightKg != null;

  // Hero prefers the latest logged entry; falls back to the onboarding weight
  // so the hero doesn't show "—" for a fresh user. hasAnyWeightData stays
  // entry-based so the empty-chart copy keeps asking for weigh-ins.
  const currentWeightKg =
    latestWeightKg ??
    (fallbackCurrentWeightKg != null && fallbackCurrentWeightKg > 0
      ? fallbackCurrentWeightKg
      : null);
  const startWeightKg = rawChartData.length > 0 ? rawChartData[0].valueKg : null;

  const totalChangeKg =
    currentWeightKg != null && startWeightKg != null ? currentWeightKg - startWeightKg : null;
  const totalChangePct =
    totalChangeKg != null && startWeightKg != null && startWeightKg !== 0
      ? (totalChangeKg / startWeightKg) * 100
      : null;

  const displayCurrentWeight = toDisplayWeight(currentWeightKg, unit);

  const drawProgress = useSharedValue(0);
  const [drawn, setDrawn] = useState(false);

  React.useEffect(() => {
    if (reducedMotion) {
      drawProgress.value = 1;
      setDrawn(true);
    } else {
      setDrawn(false);
      drawProgress.value = 0;
      drawProgress.value = withTiming(1, { duration: 900 });
    }
  }, [period, chartValues.length, drawProgress, reducedMotion]);

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

  // strokeDasharray must NOT be driven through animatedProps: Reanimated writes
  // it straight to the native view, and react-native-svg's Android path
  // (SVGLength.arrayFrom) turns a bare number into a 1-element interval array
  // instead of duplicating it to a valid pair the way the JS extractStroke
  // path does for a static JSX prop. A 1-element array crashes native with
  // ArrayIndexOutOfBoundsException in DashPathEffect (same class of bug fixed
  // in DailyProgressRings.tsx). Keep the dash pattern static below and only
  // animate the offset.
  const animatedLineProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: DASH_LENGTH * (1 - drawProgress.value),
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
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(0).duration(320)}
      style={styles.section}
    >
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
            <Text style={[styles.deltaChipText, { color: isDown ? colors.success.DEFAULT : errorText }]}>
              {totalChangePct > 0 ? '+' : ''}
              {totalChangePct.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      {/* Goal/target readout lives in GoalProgressSection below — the hero
          intentionally shows current status only (no duplicate goal line). */}

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
              strokeDasharray={`${DASH_LENGTH} ${DASH_LENGTH}`}
              animatedProps={animatedLineProps}
            />
            <Circle cx={geom.lastX} cy={geom.lastY} r={5} fill={LINE_COLOR} />
            <Circle cx={geom.lastX} cy={geom.lastY} r={9} fill={LINE_COLOR} opacity={0.22} />
          </Svg>
        ) : (
          <View style={styles.emptyChart}>
            <Ionicons name="stats-chart-outline" size={28} color={colors.text.muted} />
            <Text style={styles.emptyChartText}>
              {rawChartData.length === 0 && hasAnyWeightData
                ? 'No entries in this period'
                : 'Log at least 2 entries to see your journey'}
            </Text>
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
        <SlidingSegmentedControl
          options={PERIODS.map((item) => ({ id: item.key, label: item.label }))}
          selectedId={period}
          onSelect={(id) => onPeriodPress(id as Period)}
          variant="aurora"
          testIDPrefix="weight-journey-period"
        />
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
    marginTop: spacing.md,
  },
});

export default WeightJourneySection;
