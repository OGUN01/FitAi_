import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useAchievementStore } from '../../stores';
import { AnimatedPressable } from '../ui/aurora/AnimatedPressable';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../../theme/aurora-tokens';
import { duration, easingFunctions } from '../../theme/animations';
import { rf } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW } from '../../utils/colors';

export interface StreakPillProps {
  onPress?: () => void;
  testID?: string;
}

export const StreakPill: React.FC<StreakPillProps> = ({ onPress, testID }) => {
  const streak = useAchievementStore((s) => s.nutritionStreak);
  // At 0 the orange-tinted pill + grey "0" reads as a broken state, not an
  // invitation. Reframe as a neutral "Start your streak" CTA; only light the
  // flame tint once a streak actually exists.
  const hasStreak = streak > 0;
  const flameColor = hasStreak ? colors.warning : colors.textMuted;
  const textColor = hasStreak ? colors.warning : colors.textSecondary;
  const bgColor = hasStreak ? hexToRgba(colors.warning, TINT_ALPHA_LOW) : colors.surface;
  const label = hasStreak ? `${streak} day streak` : 'Start your streak';
  const a11yLabel = hasStreak ? `${streak} day nutrition streak` : 'Start your nutrition streak';

  // Subtle "breath" on the flame when a streak is live — a gentle scale
  // 1.0 → 1.1 → 1.0 loop. No motion at streak 0 (the flame is grey/off).
  const flameScale = useSharedValue(1);
  useEffect(() => {
    if (hasStreak) {
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: duration.slow, easing: easingFunctions.easeInOut }),
          withTiming(1.0, { duration: duration.slow, easing: easingFunctions.easeInOut }),
        ),
        -1, // infinite
        false,
      );
    } else {
      flameScale.value = 1;
    }
  }, [hasStreak, flameScale]);
  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const content = (
    <>
      <Animated.View style={flameStyle}>
        <Ionicons name="flame" size={rf(16)} color={flameColor} />
      </Animated.View>
      <Text
        style={[styles.text, { color: textColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </>
  );

  const pillStyle = [styles.pill, { backgroundColor: bgColor }];

  // StreakPill is a hero-header element — it should enter with the rest of
  // the header, not pop. Every sibling animates in; this used to hard-cut.
  const entering = FadeInDown.delay(100).duration(300).springify();

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.95}
        hapticType="light"
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        testID={testID}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        style={pillStyle}
      >
        <Animated.View entering={entering} style={styles.inner} collapsable={false}>
          {content}
        </Animated.View>
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View entering={entering} style={[pillStyle, styles.inner]} testID={testID}>
      {content}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  // Inner row carries the entrance animation without colliding with the
  // pressable's own scale transform.
  inner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: String(typography.fontWeight.bold) as any,
  },
});

export default StreakPill;
