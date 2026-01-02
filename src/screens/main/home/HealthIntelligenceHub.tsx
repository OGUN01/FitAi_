/**
 * HealthIntelligenceHub Component
 * World-class health metrics dashboard inspired by Apple Health & Oura Ring
 * 
 * Features:
 * - Recovery Score (composite metric)
 * - Resting Heart Rate with trend
 * - Sleep Quality visualization
 * - Activity readiness indicator
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  FadeInRight,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw, rh } from '../../../utils/responsive';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Recovery score color mapping
const getRecoveryColor = (score: number) => {
  if (score >= 80) return { color: '#4CAF50', label: 'Optimal', gradient: ['#4CAF50', '#8BC34A'] };
  if (score >= 60) return { color: '#FFC107', label: 'Moderate', gradient: ['#FFC107', '#FFD54F'] };
  if (score >= 40) return { color: '#FF9800', label: 'Low', gradient: ['#FF9800', '#FFB74D'] };
  return { color: '#F44336', label: 'Poor', gradient: ['#F44336', '#EF5350'] };
};

// Sleep quality color mapping
const getSleepColor = (quality: string) => {
  switch (quality) {
    case 'excellent': return '#4CAF50';
    case 'good': return '#8BC34A';
    case 'fair': return '#FFC107';
    case 'poor': return '#F44336';
    default: return '#9E9E9E';
  }
};

interface HealthIntelligenceHubProps {
  // Recovery metrics
  sleepHours?: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  restingHeartRate?: number;
  hrTrend?: 'up' | 'down' | 'stable';
  steps?: number;
  stepsGoal?: number;
  activeCalories?: number;
  
  // User data for calculations
  age?: number;
  
  onPress?: () => void;
  onDetailPress?: (metric: string) => void;
}

// Recovery Score Ring Component
const RecoveryRing: React.FC<{ score: number; size: number }> = ({ score, size }) => {
  const { color, gradient } = getRecoveryColor(score);
  const strokeWidth = rw(8);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = (score / 100) * circumference;

  return (
    <View style={[styles.ringContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="recoveryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradient[0]} />
            <Stop offset="100%" stopColor={gradient[1]} />
          </LinearGradient>
        </Defs>
        {/* Background ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#recoveryGrad)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <Text style={[styles.ringScore, { color }]}>{score}</Text>
        <Text style={styles.ringLabel}>Recovery</Text>
      </View>
    </View>
  );
};

// Mini Metric Card Component
const MetricItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subvalue?: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  onPress?: () => void;
  delay?: number;
}> = ({ icon, label, value, subvalue, color, trend, onPress, delay = 0 }) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    const icons = {
      up: 'trending-up' as const,
      down: 'trending-down' as const,
      stable: 'remove' as const,
    };
    const colors = {
      up: '#F44336', // HR going up is usually bad
      down: '#4CAF50', // HR going down is usually good
      stable: '#9E9E9E',
    };
    return (
      <Ionicons name={icons[trend]} size={rf(12)} color={colors[trend]} style={styles.trendIcon} />
    );
  };

  return (
    <Animated.View entering={FadeInRight.delay(delay).springify()}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.96}
        hapticFeedback={true}
        hapticType="light"
        style={styles.metricItem}
      >
        <View style={[styles.metricIconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={rf(16)} color={color} />
        </View>
        <View style={styles.metricContent}>
          <Text style={styles.metricLabel}>{label}</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>{value}</Text>
            {subvalue && <Text style={styles.metricSubvalue}>{subvalue}</Text>}
            {getTrendIcon()}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

export const HealthIntelligenceHub: React.FC<HealthIntelligenceHubProps> = ({
  sleepHours,
  sleepQuality,
  restingHeartRate,
  hrTrend,
  steps,
  stepsGoal = 10000,
  activeCalories,
  age = 30,
  onPress,
  onDetailPress,
}) => {
  // Check if we have ANY real health data
  const hasRealData = useMemo(() => {
    return (
      (sleepHours !== undefined && sleepHours > 0) ||
      restingHeartRate !== undefined ||
      (steps !== undefined && steps > 0) ||
      (activeCalories !== undefined && activeCalories > 0)
    );
  }, [sleepHours, restingHeartRate, steps, activeCalories]);

  // Calculate recovery score ONLY if we have real data
  const recoveryScore = useMemo(() => {
    // If no real data, return null to show placeholder
    if (!hasRealData) return null;

    let score = 50; // Base score

    // Sleep contribution (40% of score)
    const actualSleepHours = sleepHours || 0;
    const actualSleepQuality = sleepQuality || 'fair';
    const sleepScore = Math.min(actualSleepHours / 8, 1) * 40;
    if (actualSleepQuality === 'excellent') score += sleepScore * 1.2;
    else if (actualSleepQuality === 'good') score += sleepScore;
    else if (actualSleepQuality === 'fair') score += sleepScore * 0.7;
    else score += sleepScore * 0.4;

    // Heart rate contribution (30% of score)
    if (restingHeartRate) {
      const idealRestingHR = 60;
      const hrDiff = Math.abs(restingHeartRate - idealRestingHR);
      const hrScore = Math.max(0, 30 - hrDiff);
      score += hrScore;
    }

    // Activity contribution (30% of score)
    const actualSteps = steps || 0;
    const activityScore = Math.min(actualSteps / stepsGoal, 1) * 30;
    score += activityScore * 0.7; // Not overdoing it is good for recovery

    return Math.round(Math.min(Math.max(score, 0), 100));
  }, [sleepHours, sleepQuality, restingHeartRate, steps, stepsGoal, hasRealData]);

  const { label: recoveryLabel, color: recoveryColor } = recoveryScore !== null 
    ? getRecoveryColor(recoveryScore) 
    : { label: 'No Data', color: ResponsiveTheme.colors.textMuted };
  const sleepColor = getSleepColor(sleepQuality || 'fair');
  const ringSize = rw(100);

  // Format sleep quality
  const formatSleepQuality = (quality?: string) => {
    if (!quality) return '--';
    return quality.charAt(0).toUpperCase() + quality.slice(1);
  };

  // Show placeholder when no real health data is available
  if (!hasRealData) {
    return (
      <AnimatedPressable onPress={onPress} scaleValue={0.98} hapticFeedback={true} hapticType="light">
        <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="pulse" size={rf(16)} color={ResponsiveTheme.colors.primary} />
              <Text style={styles.headerTitle}>Health Intelligence</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${ResponsiveTheme.colors.textMuted}20` }]}>
              <View style={[styles.statusDot, { backgroundColor: ResponsiveTheme.colors.textMuted }]} />
              <Text style={[styles.statusText, { color: ResponsiveTheme.colors.textMuted }]}>No Data</Text>
            </View>
          </View>

          {/* Placeholder Content */}
          <View style={styles.placeholderContent}>
            <Ionicons name="fitness-outline" size={rf(48)} color={ResponsiveTheme.colors.textMuted} />
            <Text style={styles.placeholderTitle}>Connect Health Data</Text>
            <Text style={styles.placeholderSubtitle}>
              Build a development version to sync health data from Health Connect and see your recovery metrics.
            </Text>
          </View>
        </GlassCard>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable onPress={onPress} scaleValue={0.98} hapticFeedback={true} hapticType="light">
      <GlassCard elevation={2} blurIntensity="light" padding="md" borderRadius="lg">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="pulse" size={rf(16)} color={ResponsiveTheme.colors.primary} />
            <Text style={styles.headerTitle}>Health Intelligence</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${recoveryColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: recoveryColor }]} />
            <Text style={[styles.statusText, { color: recoveryColor }]}>{recoveryLabel}</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Recovery Ring */}
          <RecoveryRing score={recoveryScore ?? 0} size={ringSize} />

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <MetricItem
              icon="heart"
              label="Resting HR"
              value={restingHeartRate ? `${restingHeartRate}` : '--'}
              subvalue="bpm"
              color="#FF6B6B"
              trend={hrTrend}
              onPress={() => onDetailPress?.('heart')}
              delay={100}
            />
            <MetricItem
              icon="moon"
              label="Sleep"
              value={sleepHours && sleepHours > 0 ? `${sleepHours.toFixed(1)}` : '--'}
              subvalue="hrs"
              color="#667eea"
              onPress={() => onDetailPress?.('sleep')}
              delay={200}
            />
            <MetricItem
              icon="fitness"
              label="Quality"
              value={formatSleepQuality(sleepQuality)}
              color={sleepColor}
              onPress={() => onDetailPress?.('quality')}
              delay={300}
            />
          </View>
        </View>

        {/* Bottom Insight */}
        <View style={styles.insightContainer}>
          <Ionicons name="bulb-outline" size={rf(14)} color={ResponsiveTheme.colors.primary} />
          <Text style={styles.insightText}>
            {(recoveryScore ?? 0) >= 80
              ? "You're well recovered. Great day for intense training!"
              : (recoveryScore ?? 0) >= 60
              ? "Moderate recovery. Consider a balanced workout."
              : (recoveryScore ?? 0) >= 40
              ? "Low recovery. Focus on light activity today."
              : "Rest recommended. Your body needs recovery."}
          </Text>
        </View>
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: ResponsiveTheme.spacing.xs,
  },
  statusDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.md,
  },
  ringContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  ringScore: {
    fontSize: rf(28),
    fontWeight: '800',
  },
  ringLabel: {
    fontSize: rf(10),
    fontWeight: '600',
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: -2,
  },
  metricsGrid: {
    flex: 1,
    gap: ResponsiveTheme.spacing.sm,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  metricIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  metricValue: {
    fontSize: rf(14),
    fontWeight: '700',
    color: ResponsiveTheme.colors.text,
  },
  metricSubvalue: {
    fontSize: rf(10),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
  },
  trendIcon: {
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  insightText: {
    flex: 1,
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
  // Placeholder styles when no health data available
  placeholderContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ResponsiveTheme.spacing.xl,
    gap: ResponsiveTheme.spacing.sm,
  },
  placeholderTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  placeholderSubtitle: {
    fontSize: rf(12),
    fontWeight: '400',
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    lineHeight: rf(18),
  },
});

export default HealthIntelligenceHub;

