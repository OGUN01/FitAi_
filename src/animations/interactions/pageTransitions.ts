import { Animated, Easing, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const pageTransitions = {
  slideInRight: {
    from: { translateX: width },
    to: { translateX: 0 },
    duration: 300,
    easing: Easing.out(Easing.ease),
  },
  slideOutLeft: {
    from: { translateX: 0 },
    to: { translateX: -width },
    duration: 300,
    easing: Easing.in(Easing.ease),
  },
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 200,
  },
};

export const animateSlideInRight = (
  translateXValue: Animated.Value,
  onComplete?: () => void,
) => {
  translateXValue.setValue(pageTransitions.slideInRight.from.translateX);
  Animated.timing(translateXValue, {
    toValue: pageTransitions.slideInRight.to.translateX,
    duration: pageTransitions.slideInRight.duration,
    easing: pageTransitions.slideInRight.easing,
    useNativeDriver: true,
  }).start(onComplete);
};

export const animateFadeIn = (
  opacityValue: Animated.Value,
  onComplete?: () => void,
) => {
  opacityValue.setValue(pageTransitions.fade.from.opacity);
  Animated.timing(opacityValue, {
    toValue: pageTransitions.fade.to.opacity,
    duration: pageTransitions.fade.duration,
    useNativeDriver: true,
  }).start(onComplete);
};

export const animateCountUp = (
  animatedValue: Animated.Value,
  from: number,
  to: number,
  duration: number = 1000,
  onUpdate?: (value: number) => void,
  decimals: number = 0,
) => {
  animatedValue.setValue(from);

  if (onUpdate) {
    const listenerId = animatedValue.addListener(({ value }) => {
      const roundedValue = Number(value.toFixed(decimals));
      onUpdate(roundedValue);
    });

    Animated.timing(animatedValue, {
      toValue: to,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      animatedValue.removeListener(listenerId);
      onUpdate(Number(to.toFixed(decimals)));
    });
  } else {
    Animated.timing(animatedValue, {
      toValue: to,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }
};
