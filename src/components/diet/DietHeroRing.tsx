import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ProgressRing } from '../ui/aurora/ProgressRing';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import {
  flatColors as colors,
  spacing,
  flatFontSize as fontSize,
  typography,
} from '../../theme/aurora-tokens';
import { fontFamilyForWeight } from '../../theme/fonts';
import { rf, rw } from '../../utils/responsive';

export interface DietHeroRingProps {
  consumed: number;
  target: number;
  testID?: string;
}

const safe = (n: number): number => (Number.isFinite(n) ? n : 0);

export const DietHeroRing: React.FC<DietHeroRingProps> = ({ consumed, target, testID }) => {
  const c = safe(consumed);
  const t = safe(target);
  const isZeroTarget = t <= 0;
  const overflow = !isZeroTarget && c > t;
  const progress = isZeroTarget ? 0 : Math.min(100, (c / t) * 100);

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container} testID={testID}>
      <ProgressRing
        progress={progress}
        size={rw(220)}
        strokeWidth={rw(18)}
        gradient={!overflow}
        gradientColors={[colors.primary, colors.secondary]}
        color={colors.error}
      >
        <View style={styles.center}>
          {isZeroTarget ? (
            <>
              <Text style={styles.heroNumber}>—</Text>
              <Text style={styles.heroCaption}>Set a goal</Text>
            </>
          ) : overflow ? (
            <>
              <View style={styles.numberRow}>
                <AnimatedNumber
                  value={Math.round(c - t)}
                  prefix="+"
                  style={{ ...styles.heroNumber, color: colors.error }}
                />
              </View>
              <Text style={[styles.heroCaption, { color: colors.error }]}>over target</Text>
              <Text style={styles.heroTarget}>of {Math.round(t)} kcal</Text>
            </>
          ) : (
            <>
              <AnimatedNumber value={Math.round(Math.max(0, t - c))} style={styles.heroNumber} />
              <Text style={styles.heroCaption}>kcal left</Text>
              <Text style={styles.heroTarget}>of {Math.round(t)} kcal</Text>
            </>
          )}
        </View>
      </ProgressRing>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center' as const,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  numberRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  heroNumber: {
    fontSize: rf(40),
    fontFamily: fontFamilyForWeight('extrabold'),
    fontWeight: String(typography.fontWeight.extrabold) as any,
    color: colors.text,
  },
  heroCaption: {
    fontSize: rf(fontSize.sm),
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  heroTarget: {
    fontSize: rf(fontSize.xs),
    color: colors.textMuted,
    marginTop: 2,
  },
});

export default DietHeroRing;
