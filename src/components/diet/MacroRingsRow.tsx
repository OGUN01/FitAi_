import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ProgressRing } from '../ui/aurora/ProgressRing';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { MACRO_PILL_COLORS } from './macroColors';
import { flatColors as colors, spacing, flatFontSize as fontSize } from '../../theme/aurora-tokens';
import { rf, rw } from '../../utils/responsive';
import { fontFamilyForWeight } from '../../theme/fonts';

export interface MacroValue {
  current: number;
  target: number;
}

export interface MacroRingsRowProps {
  protein: MacroValue;
  carbs: MacroValue;
  fat: MacroValue;
  testID?: string;
}

const safe = (n: number): number => (Number.isFinite(n) ? n : 0);

interface MacroRingItemProps {
  label: string;
  color: string;
  value: MacroValue;
  delay: number;
}

const MacroRingItem: React.FC<MacroRingItemProps> = React.memo(({ label, color, value, delay }) => {
  const current = safe(value?.current);
  const target = safe(value?.target);
  const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.item}>
      <ProgressRing
        progress={progress}
        size={rw(84)}
        strokeWidth={rw(8)}
        gradient={false}
        color={color}
      >
        <AnimatedNumber value={Math.round(current)} style={styles.ringNumber} />
      </ProgressRing>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.target} numberOfLines={1}>
        {target > 0 ? `${Math.round(current)}/${Math.round(target)} g` : '—'}
      </Text>
    </Animated.View>
  );
});

export const MacroRingsRow: React.FC<MacroRingsRowProps> = ({ protein, carbs, fat, testID }) => (
  <View style={styles.row} testID={testID}>
    <MacroRingItem label="Protein" color={MACRO_PILL_COLORS.protein} value={protein} delay={100} />
    <MacroRingItem label="Carbs" color={MACRO_PILL_COLORS.carbs} value={carbs} delay={150} />
    <MacroRingItem label="Fat" color={MACRO_PILL_COLORS.fat} value={fat} delay={200} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row' as const,
    justifyContent: 'space-around' as const,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  item: {
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  ringNumber: {
    fontSize: rf(16),
    fontFamily: fontFamilyForWeight('700'),
    fontWeight: '700' as const,
    color: colors.text,
  },
  label: {
    fontSize: rf(fontSize.sm),
    fontFamily: fontFamilyForWeight('600'),
    fontWeight: '600' as const,
  },
  target: {
    fontSize: rf(fontSize.xs),
    color: colors.textSecondary,
  },
});

export default MacroRingsRow;
