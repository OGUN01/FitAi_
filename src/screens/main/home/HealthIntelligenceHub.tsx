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
import {
  flatColors as colors,
  spacing,
  borderRadius,
  typography,
} from '../../../theme/aurora-tokens';
import { rf, rw } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';
import { useHealthIntelligenceLogic } from '../../../hooks/useHealthIntelligenceLogic';
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

  onDetailPress?: (..._args: ['heart' | 'sleep' | 'quality']) => void;
}

export const HealthIntelligenceHub: React.FC<HealthIntelligenceHubProps> = React.memo(
  ({
    sleepHours,
    sleepQuality,
    restingHeartRate,
    hrTrend: _hrTrend,
    steps,
    stepsGoal,
    activeCalories,
    onPress,
    onDetailPress: _onDetailPress,
  }) => {
    const {
      hasRealData,
      recoveryScore,
      recoveryLabel,
      recoveryColor,
      sleepColor,
      formatSleepQuality,
    } = useHealthIntelligenceLogic({
      sleepHours,
      sleepQuality,
      restingHeartRate,
      steps,
      stepsGoal,
      activeCalories,
    });

    if (!hasRealData) {
      return <HealthIntelligencePlaceholder onPress={onPress} />;
    }

    const displayScore = recoveryScore ?? 0;

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
              <Ionicons
                name="pulse"
                size={typography.variants.cardHeadline.fontSize}
                color={colors.primary}
              />
              <Text style={styles.headerTitle} numberOfLines={1}>
                Health Intelligence
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: hexToRgba(recoveryColor, 0.18) }]}>
              <View style={[styles.statusDot, { backgroundColor: recoveryColor }]} />
              <Text style={[styles.statusText, { color: recoveryColor }]}>{recoveryLabel}</Text>
            </View>
          </View>

          {/* Recovery hero — one big number, no ring. Complements the activity rings above. */}
          <View style={styles.recoveryHero}>
            <Text
              style={[styles.recoveryScore, { color: recoveryColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {displayScore}
            </Text>
            <Text style={styles.recoveryCaption} numberOfLines={1}>
              RECOVERY
            </Text>
          </View>

          {/* Vitals — three quiet chips in a row */}
          <View style={styles.vitalsRow}>
            <View style={styles.vital}>
              <Ionicons name="heart" size={rf(14)} color={colors.errorLight} />
              <Text
                style={styles.vitalValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {restingHeartRate ? `${restingHeartRate}` : '--'}
              </Text>
              <Text style={styles.vitalLabel} numberOfLines={1}>
                Resting HR
              </Text>
            </View>
            <View style={styles.vitalDivider} />
            <View style={styles.vital}>
              <Ionicons name="moon" size={rf(14)} color={colors.primary} />
              <Text
                style={styles.vitalValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {sleepHours && sleepHours > 0 ? `${sleepHours.toFixed(1)}` : '--'}
              </Text>
              <Text style={styles.vitalLabel} numberOfLines={1}>
                Sleep hrs
              </Text>
            </View>
            <View style={styles.vitalDivider} />
            <View style={styles.vital}>
              <Ionicons name="fitness" size={rf(14)} color={sleepColor} />
              <Text
                style={styles.vitalValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {formatSleepQuality(sleepQuality)}
              </Text>
              <Text style={styles.vitalLabel} numberOfLines={1}>
                Quality
              </Text>
            </View>
          </View>
        </GlassCard>
      </AnimatedPressable>
    );
  }
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  statusText: {
    ...typography.variants.caption,
    fontWeight: '600',
  },
  recoveryHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  recoveryScore: {
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: rf(48),
    lineHeight: rf(52),
  },
  recoveryCaption: {
    ...typography.variants.caption,
    fontSize: rf(11),
    letterSpacing: 2,
    color: colors.textTertiary,
  },
  vitalsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  vital: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  vitalDivider: {
    width: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.xs,
  },
  vitalValue: {
    ...typography.variants.caption2,
    fontFamily: 'Manrope_700Bold',
    fontSize: rf(14),
    color: colors.text,
  },
  vitalLabel: {
    ...typography.variants.caption,
    fontSize: rf(12),
    color: colors.textSecondary,
  },
});

export default HealthIntelligenceHub;
