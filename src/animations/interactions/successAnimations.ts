import { Animated, Easing } from "react-native";

export const successAnimations = {
  checkmarkDraw: {
    duration: 400,
    easing: Easing.out(Easing.ease),
  },
  celebration: {
    scaleDuration: 600,
    fadeOutDelay: 400,
    fadeOutDuration: 200,
  },
};

export const animateCheckmarkDraw = (
  strokeDashoffsetValue: Animated.Value,
  pathLength: number,
  onComplete?: () => void,
) => {
  strokeDashoffsetValue.setValue(pathLength);
  Animated.timing(strokeDashoffsetValue, {
    toValue: 0,
    duration: successAnimations.checkmarkDraw.duration,
    easing: successAnimations.checkmarkDraw.easing,
    useNativeDriver: false,
  }).start(onComplete);
};

export const animateCelebrationBurst = (
  scaleValue: Animated.Value,
  opacityValue: Animated.Value,
  onComplete?: () => void,
) => {
  scaleValue.setValue(0);
  opacityValue.setValue(1);

  Animated.sequence([
    Animated.spring(scaleValue, {
      toValue: 1.2,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }),
    Animated.delay(successAnimations.celebration.fadeOutDelay),
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: 1.0,
        duration: successAnimations.celebration.fadeOutDuration,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: 0,
        duration: successAnimations.celebration.fadeOutDuration,
        useNativeDriver: true,
      }),
    ]),
  ]).start(onComplete);
};
