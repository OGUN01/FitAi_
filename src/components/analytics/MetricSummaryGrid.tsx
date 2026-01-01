/**
 * MetricSummaryGrid Component
 * 2x2 grid of animated metric summary cards
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  FadeInUp,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { GlassCard } from '../ui/aurora/GlassCard';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../utils/constants';
import { rf, rw, rh } from '../../utils/responsive';
import { SectionHeader } from '../common/SectionHeader';

interface MetricData {
  weight?: {
    current: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  calories?: {
    burned: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  workouts?: {
    count: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  streak?: {
    days: number;
    isActive: boolean;
  };
}

interface MetricSummaryGridProps {
  data: MetricData;
  period: 'week' | 'month' | 'year';
  onMetricPress?: (metric: string) => void;
}

// Mini Sparkline Component
const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;

  return (
    <View style={styles.sparklineContainer}>
      {data.map((value, index) => {
        const height = ((value - minVal) / range) * 100;
        return (
          <View
            key={index}
            style={[
              styles.sparklineBar,
              {
                height: `${Math.max(height, 15)}%`,
                backgroundColor: color,
                opacity: 0.4 + (index / data.length) * 0.6,
              },
            ]}
          />
        );
      })}
    </View>
  );
};

// Streak Ring Component
const StreakRing: React.FC<{ days: number; maxDays?: number }> = ({ days, maxDays = 30 }) => {
  const size = rw(52);
  const strokeWidth = rw(4);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(days / maxDays, 1);

  // Get color based on streak length
  const getStreakColor = () => {
    if (days >= 30) return ['#FFD700', '#FFA500']; // Gold for 30+
    if (days >= 14) return ['#FF6B6B', '#FF8E53']; // Red-orange for 14+
    if (days >= 7) return ['#4CAF50', '#8BC34A']; // Green for 7+
    return ['#667eea', '#764ba2']; // Purple for starting
  };

  const gradientColors = getStreakColor();

  return (
    <View style={[styles.streakRingContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors[0]} />
            <Stop offset="100%" stopColor={gradientColors[1]} />
          </SvgGradient>
        </Defs>
        {/* Background */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#streakGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.streakRingCenter}>
        <Text style={[styles.streakNumber, { color: gradientColors[0] }]}>{days}</Text>
      </View>
    </View>
  );
};

// Single Metric Card
const MetricCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  sparklineData?: number[];
  delay?: number;
  onPress?: () => void;
  children?: React.ReactNode;
}> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  trend,
  trendValue,
  sparklineData,
  delay = 0,
  onPress,
  children,
}) => {
  const getTrendIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (trend) {
      case 'up': return 'trending-up';
      case 'down': return 'trending-down';
      default: return 'remove';
    }
  };

  const getTrendColor = () => {
    // For weight, down is good. For others, up is good.
    if (title.toLowerCase().includes('weight')) {
      return trend === 'down' ? '#4CAF50' : trend === 'up' ? '#F44336' : '#9E9E9E';
    }
    return trend === 'up' ? '#4CAF50' : trend === 'down' ? '#F44336' : '#9E9E9E';
  };

  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={styles.cardWrapper}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.97}
        hapticFeedback={true}
        hapticType="light"
        style={styles.cardPressable}
      >
        <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
          <View style={styles.cardContent}>
            {/* Icon */}
            <View style={[styles.iconCircle, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon} size={rf(18)} color={color} />
            </View>

            {/* Value */}
            <Text style={styles.metricValue}>{value}</Text>

            {/* Label */}
            <Text style={styles.metricLabel}>{title}</Text>

            {/* Subtitle or Trend */}
            {trend && trendValue && (
              <View style={styles.trendRow}>
                <Ionicons name={getTrendIcon()} size={rf(14)} color={getTrendColor()} />
                <Text style={[styles.trendText, { color: getTrendColor() }]}>{trendValue}</Text>
              </View>
            )}

            {subtitle && !trend && (
              <Text style={styles.subtitleText}>{subtitle}</Text>
            )}

            {/* Sparkline or Custom Content */}
            {sparklineData && <MiniSparkline data={sparklineData} color={color} />}
            {children}
          </View>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const MetricSummaryGrid: React.FC<MetricSummaryGridProps> = ({
  data,
  period,
  onMetricPress,
}) => {
  const formatWeight = (weight?: number) => {
    if (!weight) return '--';
    return weight.toFixed(1);
  };

  const formatCalories = (calories?: number) => {
    if (!calories) return '--';
    return calories >= 1000 ? `${(calories / 1000).toFixed(1)}K` : calories.toString();
  };

  // Determine streak message based on actual streak days
  const getStreakMessage = () => {
    const days = data.streak?.days || 0;
    if (days === 0) return 'Start today!';
    if (days >= 30) return 'On fire!';
    if (days >= 14) return 'Amazing!';
    if (days >= 7) return 'Keep it up!';
    if (days >= 3) return 'Great start!';
    return 'Building!';
  };
  
  // Only show sparklines if we have real data
  const hasWeightHistory = data.weight?.current !== undefined;
  const hasCaloriesData = data.calories?.burned !== undefined && data.calories.burned > 0;
  const hasWorkoutsData = data.workouts?.count !== undefined && data.workouts.count > 0;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <SectionHeader
        title="This Period"
        icon="stats-chart"
        iconColor="#667eea"
      />
      
      {/* Row 1: Weight + Calories */}
      <View style={styles.row}>
        <MetricCard
          title="Weight"
          value={formatWeight(data.weight?.current)}
          icon="scale-outline"
          color="#9C27B0"
          trend={hasWeightHistory ? data.weight?.trend : undefined}
          trendValue={hasWeightHistory && data.weight?.change ? `${data.weight.change > 0 ? '+' : ''}${data.weight.change.toFixed(1)} kg` : undefined}
          delay={0}
          onPress={() => onMetricPress?.('weight')}
        />

        <MetricCard
          title="Calories"
          value={formatCalories(data.calories?.burned)}
          icon="flame-outline"
          color="#FF9800"
          trend={hasCaloriesData ? data.calories?.trend : undefined}
          trendValue={hasCaloriesData && data.calories?.change ? `${data.calories.change > 0 ? '+' : ''}${data.calories.change}%` : undefined}
          delay={100}
          onPress={() => onMetricPress?.('calories')}
        />
      </View>

      {/* Row 2: Workouts + Streak */}
      <View style={styles.row}>
        <MetricCard
          title="Workouts"
          value={data.workouts?.count?.toString() || '0'}
          subtitle={`this ${period}`}
          icon="barbell-outline"
          color="#2196F3"
          trend={hasWorkoutsData ? data.workouts?.trend : undefined}
          trendValue={hasWorkoutsData && data.workouts?.change ? `${data.workouts.change > 0 ? '+' : ''}${data.workouts.change}` : undefined}
          delay={200}
          onPress={() => onMetricPress?.('workouts')}
        />

        <MetricCard
          title="Day Streak"
          value=""
          icon="flame"
          color="#FF6B6B"
          delay={300}
          onPress={() => onMetricPress?.('streak')}
        >
          <View style={styles.streakContent}>
            <StreakRing days={data.streak?.days || 0} />
            <Text style={styles.streakMessage}>{getStreakMessage()}</Text>
          </View>
        </MetricCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: ResponsiveTheme.spacing.md,
  },
  cardWrapper: {
    flex: 1,
    minWidth: 0, // Allow flex shrink
  },
  cardPressable: {
    flex: 1,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: ResponsiveTheme.spacing.xs,
  },
  iconCircle: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  metricValue: {
    fontSize: rf(24),
    fontWeight: '800',
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  metricLabel: {
    fontSize: rf(12),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  subtitleText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  trendText: {
    fontSize: rf(12),
    fontWeight: '600',
  },
  sparklineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: rh(20),
    width: '100%',
    gap: rw(2),
    marginTop: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },
  sparklineBar: {
    flex: 1,
    borderRadius: rw(1.5),
    minHeight: 3,
  },
  streakContent: {
    alignItems: 'center',
    marginTop: -ResponsiveTheme.spacing.xs,
  },
  streakRingContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakRingCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: rf(16),
    fontWeight: '800',
  },
  streakMessage: {
    fontSize: rf(9),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },
});

export default MetricSummaryGrid;

