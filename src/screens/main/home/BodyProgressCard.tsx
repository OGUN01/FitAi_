/**
 * BodyProgressCard Component
 * Weight trend visualization with goal countdown
 *
 * Features:
 * - Mini weight trend graph (7-day)
 * - Goal progress indicator
 * - Trend analysis
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  typography,
  border,
} from '../../../theme/aurora-tokens';
import { rf, rw, rh, rp } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';
import { useBodyProgressLogic, WeightEntry } from './useBodyProgressLogic';
import { TrendChart } from './components/TrendChart';
import { GoalProgressBar } from './components/GoalProgressBar';
import { toDisplayWeight } from '../../../utils/units';

interface BodyProgressCardProps {
  currentWeight?: number; // in kg or lbs
  goalWeight?: number;
  startingWeight?: number;
  weightHistory?: WeightEntry[];
  unit?: 'kg' | 'lbs';
  onPress?: () => void;
  onLogWeight?: () => void;
}

export const BodyProgressCard: React.FC<BodyProgressCardProps> = React.memo(
  ({
    currentWeight,
    goalWeight,
    startingWeight,
    weightHistory = [],
    unit = 'kg',
    onPress,
    onLogWeight,
  }) => {
    const { progress, remaining, trendInfo, chartData, hasData, progressColor } =
      useBodyProgressLogic({
        currentWeight,
        goalWeight,
        startingWeight,
        weightHistory,
      });

    const displayCurrentWeight = toDisplayWeight(currentWeight, unit);
    const displayGoalWeight = toDisplayWeight(goalWeight, unit);
    const displayRemaining = toDisplayWeight(remaining, unit);

    return (
      <View>
        <View style={styles.surface}>
          {/* Header */}
          <AnimatedPressable
            onPress={onPress}
            scaleValue={0.98}
            accessibilityRole={onPress ? 'button' : undefined}
            accessibilityLabel="View Progress"
            testID="progress-card"
            style={styles.headerPressable}
          >
            <View style={styles.headerLeft}>
              <Ionicons name="body" size={rf(16)} color={colors.primary} />
              <Text style={styles.headerTitle} numberOfLines={2}>
                Body Progress
              </Text>
            </View>
            {hasData && (
              <View
                style={[styles.trendBadge, { backgroundColor: hexToRgba(trendInfo.color, 0.125) }]}
              >
                <Ionicons name={trendInfo.icon} size={rf(12)} color={trendInfo.color} />
                <Text style={[styles.trendText, { color: trendInfo.color }]}>
                  {trendInfo.label}
                </Text>
              </View>
            )}
          </AnimatedPressable>

          {hasData ? (
            <>
              {/* Main Stats */}
              <View style={styles.mainStats}>
                <View style={styles.currentWeight}>
                  <Text
                    style={styles.weightValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {displayCurrentWeight != null ? displayCurrentWeight.toFixed(1) : '--'}
                    <Text style={styles.weightUnit}> {unit}</Text>
                  </Text>
                  <Text style={styles.weightLabel} numberOfLines={1}>
                    Current
                  </Text>
                </View>

                {/* Mini Chart */}
                <View style={styles.chartContainer}>
                  <TrendChart
                    data={
                      chartData.length >= 2
                        ? chartData
                        : startingWeight && currentWeight && startingWeight !== currentWeight
                          ? [startingWeight, currentWeight]
                          : currentWeight
                            ? [currentWeight, currentWeight]
                            : []
                    }
                    width={rw(120)}
                    height={rh(50)}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.goalWeight}>
                  <Text
                    style={styles.goalValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {displayGoalWeight != null ? displayGoalWeight.toFixed(1) : '—'}
                    <Text style={styles.goalUnit}> {unit}</Text>
                  </Text>
                  <Text style={styles.goalLabel} numberOfLines={1}>
                    Goal
                  </Text>
                </View>
              </View>

              {/* Progress Section */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel} numberOfLines={1}>
                    {goalWeight ? 'Goal Progress' : 'Body Progress'}
                  </Text>
                  <Text
                    style={[styles.progressPercent, { color: progressColor }]}
                    numberOfLines={1}
                  >
                    {goalWeight ? `${progress.toFixed(0)}%` : ''}
                  </Text>
                </View>
                <GoalProgressBar progress={progress} color={progressColor} />
                <Text style={styles.remainingText} numberOfLines={1}>
                  {!goalWeight
                    ? 'Set a goal weight'
                    : remaining > 0 && displayRemaining != null
                      ? `${displayRemaining.toFixed(1)} ${unit} to go`
                      : 'Goal reached!'}
                </Text>
              </View>

              {onLogWeight ? <View style={styles.actionButtons}>
                <AnimatedPressable
                  onPress={onLogWeight}
                  scaleValue={0.95}
                  hapticFeedback={true}
                  hapticType="light"
                  style={styles.actionButton}
                  accessibilityRole="button"
                  accessibilityLabel="Log weight"
                >
                  <Ionicons name="add-circle-outline" size={rf(16)} color={colors.primary} />
                  <Text style={styles.actionButtonText} numberOfLines={2}>
                    Log Weight
                  </Text>
                </AnimatedPressable>
              </View> : null}
            </>
          ) : (
            /* Empty State */
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="scale-outline" size={rf(32)} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle} numberOfLines={2}>
                Track Your Progress
              </Text>
              <Text style={styles.emptyDescription} numberOfLines={3}>
                Log your weight to see trends and track your fitness journey
              </Text>
              {onLogWeight ? <AnimatedPressable
                onPress={onLogWeight}
                scaleValue={0.95}
                hapticFeedback={true}
                hapticType="light"
                style={styles.startButton}
                accessibilityRole="button"
                accessibilityLabel="Log first weight"
              >
                <Ionicons name="add" size={rf(16)} color={colors.white} />
                <Text style={styles.startButtonText} numberOfLines={2}>
                  Log First Weight
                </Text>
              </AnimatedPressable> : null}
            </View>
          )}
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  // Flat Editorial-Dark surface replacing the former GlassCard (no blur, no
  // elevation). Depth comes from the 1px hairline border on a surface[1] fill.
  surface: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.lg,
    padding: rp(spacing.md),
  },
  headerPressable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    // Real Stage 3 audit finding: this whole-card-header Pressable measured
    // 25px tall (row content height only) — below the 44px WCAG/Apple/
    // Material minimum for an interactive element (DESIGN.md §8).
    minHeight: 44,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text,
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    flexShrink: 0,
  },
  trendText: {
    fontSize: rf(12),
    fontFamily: "Manrope_600SemiBold",
  },
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  currentWeight: {
    alignItems: 'flex-start',
    flexShrink: 0,
  },
  weightValue: {
    fontSize: rf(28),
    fontFamily: "Manrope_800ExtraBold",
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  weightUnit: {
    fontSize: rf(14),
    fontFamily: "Manrope_600SemiBold",
    color: colors.textSecondary,
  },
  weightLabel: {
    fontSize: rf(12),
    fontFamily: "Manrope_500Medium",
    color: colors.textSecondary,
  },
  chartContainer: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  goalWeight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  goalValue: {
    fontSize: rf(18),
    fontFamily: "Manrope_600SemiBold",
    color: colors.textSecondary,
  },
  goalUnit: {
    fontSize: rf(12),
    fontFamily: "Manrope_500Medium",
    color: colors.textSecondary,
  },
  goalLabel: {
    fontSize: rf(12),
    fontFamily: "Manrope_500Medium",
    color: colors.textSecondary,
  },
  progressSection: {
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: rf(12),
    fontFamily: "Manrope_600SemiBold",
    color: colors.textSecondary,
  },
  progressPercent: {
    fontSize: rf(13),
    fontFamily: "Manrope_700Bold",
    fontVariant: ['tabular-nums'],
  },
  remainingText: {
    ...typography.variants.caption2,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: border.subtle,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  actionButtonText: {
    fontSize: rf(12),
    fontFamily: "Manrope_600SemiBold",
    color: colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyIconContainer: {
    width: rw(60),
    height: rw(60),
    borderRadius: rw(30),
    backgroundColor: colors.primaryTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: rf(14),
    fontFamily: "Manrope_700Bold",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyDescription: {
    fontSize: rf(12),
    fontFamily: "Manrope_500Medium",
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    minHeight: 44,
  },
  startButtonText: {
    fontSize: rf(13),
    fontFamily: "Manrope_700Bold",
    color: colors.white,
  },
});

export default BodyProgressCard;
