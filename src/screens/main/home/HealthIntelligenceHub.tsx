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

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw } from '../../../utils/responsive';
import { useHealthIntelligenceLogic } from '../../../hooks/useHealthIntelligenceLogic';
import { RecoveryRing } from '../../../components/home/RecoveryRing';
import { MetricItem } from '../../../components/home/MetricItem';
import { HealthIntelligencePlaceholder } from '../../../components/home/HealthIntelligencePlaceholder';

interface HealthIntelligenceHubProps {
  // Recovery metrics
  sleepHours?: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';
  restingHeartRate?: number;
  hrTrend?: 'up' | 'down' | 'stable';
  steps?: number;
  stepsGoal?: number;
  activeCalories?: number;

  onPress?: () => void;
  // eslint-disable-next-line no-unused-vars
  onDetailPress?: (..._args: ['heart' | 'sleep' | 'quality']) => void;
}

export const HealthIntelligenceHub: React.FC<HealthIntelligenceHubProps> = React.memo(({
  sleepHours,
  sleepQuality,
  restingHeartRate,
  hrTrend,
  steps,
  stepsGoal,
  activeCalories,
  onPress,
  onDetailPress,
}) => {
  const {
    hasRealData,
    recoveryScore,
    recoveryLabel,
    recoveryColor,
    sleepColor,
    formatSleepQuality,
    insightText,
  } = useHealthIntelligenceLogic({
    sleepHours,
    sleepQuality,
    restingHeartRate,
    steps,
    stepsGoal,
    activeCalories,
  });

  const ringSize = rw(100);

  if (!hasRealData) {
    return <HealthIntelligencePlaceholder onPress={onPress} />;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
      accessibilityRole="button"
      accessibilityLabel="Health Intelligence"
    >
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
              color={ResponsiveTheme.colors.errorLight}
              trend={hrTrend}
              onPress={() => onDetailPress?.('heart')}
              delay={100}
              containerStyle={styles.metricCell}
            />
            <MetricItem
              icon="moon"
              label="Sleep"
              value={sleepHours && sleepHours > 0 ? `${sleepHours.toFixed(1)}` : '--'}
              subvalue="hrs"
              color={ResponsiveTheme.colors.primary}
              onPress={() => onDetailPress?.('sleep')}
              delay={200}
              containerStyle={styles.metricCell}
            />
            <MetricItem
              icon="fitness"
              label="Quality"
              value={formatSleepQuality(sleepQuality)}
              color={sleepColor}
              onPress={() => onDetailPress?.('quality')}
              delay={300}
              containerStyle={styles.metricCellFull}
            />
          </View>
        </View>

        {/* Bottom Insight */}
        <View style={styles.insightContainer}>
          <Ionicons name="bulb-outline" size={rf(14)} color={ResponsiveTheme.colors.primary} />
          <Text style={styles.insightText}>{insightText}</Text>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
});

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
    alignItems: 'flex-start',
    gap: ResponsiveTheme.spacing.md,
  },
  metricsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ResponsiveTheme.spacing.sm,
  },
  metricCell: {
    width: '47%',
  },
  metricCellFull: {
    width: '100%',
  },
  insightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassBorder,
  },
  insightText: {
    flex: 1,
    fontSize: rf(11),
    fontWeight: '500',
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(16),
  },
});

export default HealthIntelligenceHub;
