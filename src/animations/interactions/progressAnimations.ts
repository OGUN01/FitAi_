import { Animated, Easing } from "react-native";

export const progressAnimations = {
  linear: {
    duration: 800,
    easing: Easing.out(Easing.cubic),
  },
  circular: {
    duration: 1000,
    easing: Easing.out(Easing.cubic),
  },
};

export const animateProgressFill = (
  widthValue: Animated.Value,
  percentage: number,
  onComplete?: () => void,
) => {
  Animated.timing(widthValue, {
    toValue: percentage,
    duration: progressAnimations.linear.duration,
    easing: progressAnimations.linear.easing,
    useNativeDriver: false,
  }).start(onComplete);
};

export const animateCircularProgress = (
  strokeDashoffsetValue: Animated.Value,
  circumference: number,
  percentage: number,
  onComplete?: () => void,
) => {
  const targetOffset = circumference * (1 - percentage / 100);

  Animated.timing(strokeDashoffsetValue, {
    toValue: targetOffset,
    duration: progressAnimations.circular.duration,
    easing: progressAnimations.circular.easing,
    useNativeDriver: false,
  }).start(onComplete);
};

export const tabAnimations = {
  indicatorMorph: {
    spring: {
      damping: 20,
      stiffness: 120,
    },
  },
};

export const animateTabIndicator = (
  translateXValue: Animated.Value,
  widthValue: Animated.Value,
  targetPosition: number,
  targetWidth: number,
) => {
  Animated.parallel([
    Animated.spring(translateXValue, {
      toValue: targetPosition,
      damping: tabAnimations.indicatorMorph.spring.damping,
      stiffness: tabAnimations.indicatorMorph.spring.stiffness,
      useNativeDriver: false,
    }),
    Animated.spring(widthValue, {
      toValue: targetWidth,
      damping: tabAnimations.indicatorMorph.spring.damping,
      stiffness: tabAnimations.indicatorMorph.spring.stiffness,
      useNativeDriver: false,
    }),
  ]).start();
};
