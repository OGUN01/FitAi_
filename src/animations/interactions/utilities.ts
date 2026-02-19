import { Animated, Easing } from "react-native";

export const createLoopAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number,
  easing: (value: number) => number = Easing.inOut(Easing.ease),
): Animated.CompositeAnimation => {
  return Animated.loop(
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue,
        duration,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration,
        easing,
        useNativeDriver: true,
      }),
    ]),
  );
};

export const createSpringAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  damping: number = 15,
  stiffness: number = 100,
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    damping,
    stiffness,
    useNativeDriver: true,
  });
};

export const createTimingAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number,
  easing: (value: number) => number = Easing.out(Easing.ease),
  useNativeDriver: boolean = true,
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing,
    useNativeDriver,
  });
};
