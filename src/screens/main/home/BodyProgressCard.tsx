/**
 * BodyProgressCard Component
 * Weight trend visualization with goal countdown
 * 
 * Features:
 * - Mini weight trend graph (7-day)
 * - Goal progress indicator
 * - Photo comparison shortcut
 * - Trend analysis
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw, rh } from '../../../utils/responsive';

interface WeightEntry {
  date: string;
  weight: number;
}

interface BodyProgressCardProps {
  currentWeight?: number; // in kg or lbs
  goalWeight?: number;
  startingWeight?: number;
  weightHistory?: WeightEntry[];
  unit?: 'kg' | 'lbs';
  onPress?: () => void;
  onPhotoPress?: () => void;
  onLogWeight?: () => void;
}

// Mini Trend Chart Component
const TrendChart: React.FC<{
  data: number[];
  width: number;
  height: number;
  color: string;
}> = ({ data, width, height, color }) => {
  // Filter out NaN and invalid values
  const validData = data.filter(v => Number.isFinite(v));
  
  if (validData.length < 2) {
    return (
      <View style={[styles.emptyChart, { width, height }]}>
        <Text style={styles.emptyChartText}>Not enough data</Text>
      </View>
    );
  }

  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const minValue = Math.min(...validData) - 1;
  const maxValue = Math.max(...validData) + 1;
  const range = maxValue - minValue || 1;

  const points = validData.map((value, index) => {
    const x = Math.round(padding + (index / (validData.length - 1)) * chartWidth);
    const y = Math.round(padding + chartHeight - ((value - minValue) / range) * chartHeight);
    return { x, y };
  });

  // Create smooth curve path - round all values to prevent NaN in Android native
  const pathData = points.reduce((acc, point, index) => {
    if (index === 0) {
      return `M ${point.x} ${point.y}`;
    }
    const prev = points[index - 1];
    const cpX = Math.round((prev.x + point.x) / 2);
    const cpY = Math.round((prev.y + point.y) / 2);
    return `${acc} Q ${cpX} ${prev.y}, ${cpX} ${cpY} T ${point.x} ${point.y}`;
  }, '');

  // Area fill path
  const lastX = points[points.length - 1]?.x ?? padding;
  const areaPath = `${pathData} L ${lastX} ${height - padding} L ${padding} ${height - padding} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.05} />
        </LinearGradient>
      </Defs>
      {/* Grid lines */}
      <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
      {/* Area fill */}
      <Path d={areaPath} fill="url(#chartGradient)" />
      {/* Line */}
      <Path d={pathData} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      {/* Current point */}
      <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={color} />
      <Circle cx={lastPoint.x} cy={lastPoint.y} r={6} fill={color} fillOpacity={0.3} />
    </Svg>
  );
};

// Progress Bar Component
const GoalProgressBar: React.FC<{
  progress: number;
  color: string;
}> = ({ progress, color }) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  
  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBg}>
        <Animated.View 
          style={[
            styles.progressBarFill, 
            { 
              width: `${clampedProgress}%`,
              backgroundColor: color,
            }
          ]} 
        />
      </View>
    </View>
  );
};

export const BodyProgressCard: React.FC<BodyProgressCardProps> = ({
  currentWeight,
  goalWeight,
  startingWeight,
  weightHistory = [],
  unit = 'kg',
  onPress,
  onPhotoPress,
  onLogWeight,
}) => {
  // Calculate progress and trend
  const { progress, remaining, trend, trendDirection } = useMemo(() => {
    if (!currentWeight || !goalWeight || !startingWeight) {
      return { progress: 0, remaining: 0, trend: 0, trendDirection: 'stable' as const };
    }

    const totalChange = Math.abs(startingWeight - goalWeight);
    const currentChange = Math.abs(startingWeight - currentWeight);
    const progressPercent = totalChange > 0 ? (currentChange / totalChange) * 100 : 0;
    
    // For weight loss: starting > goal, for weight gain: starting < goal
    const isLosing = startingWeight > goalWeight;
    const remainingWeight = isLosing 
      ? Math.max(currentWeight - goalWeight, 0)
      : Math.max(goalWeight - currentWeight, 0);

    // Calculate 7-day trend
    const recentWeights = weightHistory.slice(-7).map(e => e.weight);
    let trendValue = 0;
    let direction: 'up' | 'down' | 'stable' = 'stable';
    
    if (recentWeights.length >= 2) {
      const firstHalf = recentWeights.slice(0, Math.floor(recentWeights.length / 2));
      const secondHalf = recentWeights.slice(Math.floor(recentWeights.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trendValue = secondAvg - firstAvg;
      
      if (Math.abs(trendValue) < 0.2) {
        direction = 'stable';
      } else if (trendValue > 0) {
        direction = 'up';
      } else {
        direction = 'down';
      }
    }

    return {
      progress: Math.min(progressPercent, 100),
      remaining: remainingWeight,
      trend: trendValue,
      trendDirection: direction,
    };
  }, [currentWeight, goalWeight, startingWeight, weightHistory]);

  // Get trend color and icon
  const getTrendInfo = () => {
    const isLosing = startingWeight && goalWeight && startingWeight > goalWeight;
    
    if (trendDirection === 'stable') {
      return { icon: 'remove' as const, color: '#9E9E9E', label: 'Stable' };
    }
    
    // For weight loss: down is good, for weight gain: up is good
    if (isLosing) {
      return trendDirection === 'down'
        ? { icon: 'trending-down' as const, color: '#4CAF50', label: 'On track' }
        : { icon: 'trending-up' as const, color: '#FF9800', label: 'Review needed' };
    } else {
      return trendDirection === 'up'
        ? { icon: 'trending-up' as const, color: '#4CAF50', label: 'On track' }
        : { icon: 'trending-down' as const, color: '#FF9800', label: 'Review needed' };
    }
  };

  const trendInfo = getTrendInfo();
  const chartData = weightHistory.slice(-7).map(e => e.weight);
  const hasData = currentWeight !== undefined;

  // Progress color based on percentage
  const progressColor = progress >= 75 ? '#4CAF50' : progress >= 50 ? '#8BC34A' : progress >= 25 ? '#FFC107' : '#FF9800';

  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.98} hapticFeedback={true} hapticType="light">
      <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="body" size={rf(16)} color="#9C27B0" />
            <Text style={styles.headerTitle}>Body Progress</Text>
          </View>
          {hasData && (
            <View style={[styles.trendBadge, { backgroundColor: `${trendInfo.color}20` }]}>
              <Ionicons name={trendInfo.icon} size={rf(12)} color={trendInfo.color} />
              <Text style={[styles.trendText, { color: trendInfo.color }]}>{trendInfo.label}</Text>
            </View>
          )}
        </View>

        {hasData ? (
          <>
            {/* Main Stats */}
            <View style={styles.mainStats}>
              <View style={styles.currentWeight}>
                <Text style={styles.weightValue}>
                  {currentWeight?.toFixed(1)}
                  <Text style={styles.weightUnit}> {unit}</Text>
                </Text>
                <Text style={styles.weightLabel}>Current</Text>
              </View>

              {/* Mini Chart */}
              <View style={styles.chartContainer}>
                <TrendChart
                  data={chartData.length >= 2 ? chartData : [currentWeight || 0, currentWeight || 0]}
                  width={rw(120)}
                  height={rh(50)}
                  color="#9C27B0"
                />
              </View>

              <View style={styles.goalWeight}>
                <Text style={styles.goalValue}>
                  {goalWeight?.toFixed(1)}
                  <Text style={styles.goalUnit}> {unit}</Text>
                </Text>
                <Text style={styles.goalLabel}>Goal</Text>
              </View>
            </View>

            {/* Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Goal Progress</Text>
                <Text style={[styles.progressPercent, { color: progressColor }]}>{progress.toFixed(0)}%</Text>
              </View>
              <GoalProgressBar progress={progress} color={progressColor} />
              <Text style={styles.remainingText}>
                {remaining > 0 
                  ? `${remaining.toFixed(1)} ${unit} to go`
                  : '🎉 Goal reached!'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <AnimatedPressable
                onPress={onLogWeight}
                scaleValue={0.95}
                hapticFeedback={true}
                hapticType="light"
                style={styles.actionButton}
              >
                <Ionicons name="add-circle-outline" size={rf(16)} color="#9C27B0" />
                <Text style={styles.actionButtonText}>Log Weight</Text>
              </AnimatedPressable>

              <View style={styles.actionDivider} />

              <AnimatedPressable
                onPress={onPhotoPress}
                scaleValue={0.95}
                hapticFeedback={true}
                hapticType="light"
                style={styles.actionButton}
              >
                <Ionicons name="camera-outline" size={rf(16)} color="#9C27B0" />
                <Text style={styles.actionButtonText}>Progress Photo</Text>
              </AnimatedPressable>
            </View>
          </>
        ) : (
          /* Empty State */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="scale-outline" size={rf(32)} color="#9C27B0" />
            </View>
            <Text style={styles.emptyTitle}>Track Your Progress</Text>
            <Text style={styles.emptyDescription}>
              Log your weight to see trends and track your fitness journey
            </Text>
            <AnimatedPressable
              onPress={onLogWeight}
              scaleValue={0.95}
              hapticFeedback={true}
              hapticType="medium"
              style={styles.startButton}
            >
              <Ionicons name="add" size={rf(16)} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Log First Weight</Text>
            </AnimatedPressable>
          </View>
        )}
      </GlassCard>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    letterSpacing: 0.3,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: ResponsiveTheme.spacing.xs,
  },
  trendText: {
    fontSize: rf(11),
    fontWeight: '600',
  },
  mainStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: ResponsiveTheme.spacing.md,
  },
  currentWeight: {
    alignItems: 'flex-start',
  },
  weightValue: {
    fontSize: rf(24),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
  },
  weightUnit: {
    fontSize: rf(14),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  weightLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },
  chartContainer: {
    flex: 1,
    alignItems: 'center',
  },
  goalWeight: {
    alignItems: 'flex-end',
  },
  goalValue: {
    fontSize: rf(18),
    fontWeight: '700',
    color: ResponsiveTheme.colors.textSecondary,
  },
  goalUnit: {
    fontSize: rf(12),
    fontWeight: '500',
  },
  goalLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },
  progressSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  progressLabel: {
    fontSize: rf(11),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
  },
  progressPercent: {
    fontSize: rf(12),
    fontWeight: '700',
  },
  progressBarContainer: {
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  progressBarBg: {
    height: rh(6),
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: rh(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: rh(3),
  },
  remainingText: {
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ResponsiveTheme.spacing.xs,
    paddingVertical: ResponsiveTheme.spacing.xs,
  },
  actionButtonText: {
    fontSize: rf(12),
    fontWeight: '600',
    color: '#9C27B0',
  },
  actionDivider: {
    width: 1,
    height: rh(20),
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.md,
  },
  emptyIconContainer: {
    width: rw(60),
    height: rw(60),
    borderRadius: rw(30),
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
  },
  emptyTitle: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  emptyDescription: {
    fontSize: rf(12),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    backgroundColor: '#9C27B0',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  startButtonText: {
    fontSize: rf(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyChart: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  emptyChartText: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default BodyProgressCard;

