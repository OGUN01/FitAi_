import { Animated, Easing } from "react-native";

export const buttonAnimations = {
  press: {
    scale: 0.95,
    duration: 100,
    easing: Easing.out(Easing.ease),
  },
  release: {
    scale: 1.0,
    spring: {
      damping: 15,
      stiffness: 100,
    },
  },
};

export const animateButtonPress = (
  scaleValue: Animated.Value,
  onPressComplete?: () => void,
) => {
  Animated.sequence([
    Animated.timing(scaleValue, {
      toValue: buttonAnimations.press.scale,
      duration: buttonAnimations.press.duration,
      easing: buttonAnimations.press.easing,
      useNativeDriver: true,
    }),
    Animated.spring(scaleValue, {
      toValue: buttonAnimations.release.scale,
      damping: buttonAnimations.release.spring.damping,
      stiffness: buttonAnimations.release.spring.stiffness,
      useNativeDriver: true,
    }),
  ]).start(onPressComplete);
};
