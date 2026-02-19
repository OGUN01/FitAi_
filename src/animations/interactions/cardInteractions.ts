import { Animated, Easing } from "react-native";

export const cardAnimations = {
  lift: {
    translateY: -4,
    shadowOpacity: 0.3,
    duration: 200,
    easing: Easing.out(Easing.ease),
  },
  rest: {
    translateY: 0,
    shadowOpacity: 0.2,
    spring: {
      damping: 12,
      stiffness: 80,
    },
  },
};

export const animateCardLift = (
  translateYValue: Animated.Value,
  shadowOpacityValue?: Animated.Value,
) => {
  const animations: Animated.CompositeAnimation[] = [
    Animated.timing(translateYValue, {
      toValue: cardAnimations.lift.translateY,
      duration: cardAnimations.lift.duration,
      easing: cardAnimations.lift.easing,
      useNativeDriver: true,
    }),
  ];

  if (shadowOpacityValue) {
    animations.push(
      Animated.timing(shadowOpacityValue, {
        toValue: cardAnimations.lift.shadowOpacity,
        duration: cardAnimations.lift.duration,
        easing: cardAnimations.lift.easing,
        useNativeDriver: true,
      }),
    );
  }

  Animated.parallel(animations).start();
};

export const animateCardRest = (
  translateYValue: Animated.Value,
  shadowOpacityValue?: Animated.Value,
) => {
  const animations: Animated.CompositeAnimation[] = [
    Animated.spring(translateYValue, {
      toValue: cardAnimations.rest.translateY,
      damping: cardAnimations.rest.spring.damping,
      stiffness: cardAnimations.rest.spring.stiffness,
      useNativeDriver: true,
    }),
  ];

  if (shadowOpacityValue) {
    animations.push(
      Animated.spring(shadowOpacityValue, {
        toValue: cardAnimations.rest.shadowOpacity,
        damping: cardAnimations.rest.spring.damping,
        stiffness: cardAnimations.rest.spring.stiffness,
        useNativeDriver: true,
      }),
    );
  }

  Animated.parallel(animations).start();
};
