import React, { useEffect, useRef } from "react";
import { Text, TextStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  style?: TextStyle;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  decimals = 0,
  style,
  duration = 1000,
  prefix = "",
  suffix = "",
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
    } as any;
  });

  return (
    <AnimatedText style={style} animatedProps={animatedProps}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </AnimatedText>
  );
};
