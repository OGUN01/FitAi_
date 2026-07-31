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
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { flatColors as colors, spacing, typography, borderRadius, border } from '../../../theme/aurora-tokens';
import { rf, rp } from '../../../utils/responsive';
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

  // Separate CTA for the no-data placeholder ("Connect Health Data") — it must
  // route to the wearable connection flow, not the same destination as the
  // populated card. Falls back to onPress when not provided.
  onConnectPress?: () => void;

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
    onConnectPress,
    onDetailPress: _onDetailPress,
  }) => {
    const { hasRealData, recoveryScore, recoveryColor, sleepColor, formatSleepQuality } =
      useHealthIntelligenceLogic({
        sleepHours,
        sleepQuality,
        restingHeartRate,
        steps,
        stepsGoal,
        activeCalories,
      });

    if (!hasRealData) {
      return <HealthIntelligencePlaceholder onPress={onConnectPress ?? onPress} />;
    }

    // recoveryScore is null when there's no sufficient recovery data (sleep or
    // HR) — the hook documents null as "show '--'". Rendering 0 here instead
    // showed a misleading "0 RECOVERY" for steps-only users (hasRealData=true
    // but no recovery inputs). Mirror the other "--" placeholders in this card.
    const displayScore = recoveryScore == null ? '--' : recoveryScore;

    return (
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.98}
        hapticFeedback={true}
        hapticType="light"
        accessibilityRole="button"
        accessibilityLabel="Health Intelligence"
      >
        <View style={styles.surface}>
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
            {/* No recovery status badge here — the TodayHero coach line directly
                above already conveys the same recovery state (same hook, same
                label/color). Repeating it stacked the indicator twice. */}
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
        </View>
      </AnimatedPressable>
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
    fontVariant: ['tabular-nums'],
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
    borderTopColor: border.subtle,
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
    backgroundColor: border.subtle,
    marginVertical: spacing.xs,
  },
  vitalValue: {
    ...typography.variants.caption2,
    fontFamily: 'Manrope_700Bold',
    fontSize: rf(14),
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  vitalLabel: {
    ...typography.variants.caption,
    fontSize: rf(12),
    color: colors.textSecondary,
  },
});

export default HealthIntelligenceHub;
