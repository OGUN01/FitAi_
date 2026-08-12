import React, { useEffect, useRef } from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  prefix?: string;
  suffix?: string;
  /**
   * Overrides the default `${prefix}${value}${suffix}` accessibility label.
   * Use when the surrounding UI needs to announce more context (e.g. a
   * metric name) than prefix/suffix alone can express.
   */
  accessibilityLabel?: string;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

// Memoized (matching Button's pattern) since this is designed to be dropped
// into frequently-updating stat displays — without it, every parent
// re-render re-derives animatedProps/JSX even when value/decimals/prefix/
// suffix are unchanged.
export const AnimatedNumber: React.FC<AnimatedNumberProps> = React.memo(({
  value,
  decimals = 0,
  style,
  duration = 1000,
  prefix = "",
  suffix = "",
  accessibilityLabel,
}) => {
  const animatedValue = useSharedValue(0);
  const previousValue = useRef(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
    previousValue.current = value;
  }, [value]);

  const animatedProps = useAnimatedProps(() => {
    const displayValue = animatedValue.value.toFixed(decimals);
    return {
      text: `${prefix}${displayValue}${suffix}`,
    } as { text: string };
  });

  return (
    <AnimatedText
      style={style}
      // @ts-ignore - Reanimated AnimatedProps type issue with text prop
      animatedProps={animatedProps}
      accessibilityRole="text"
      accessibilityLabel={
        accessibilityLabel ?? `${prefix}${value.toFixed(decimals)}${suffix}`
      }
    >
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </AnimatedText>
  );
});
