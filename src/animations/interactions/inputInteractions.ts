import { Animated, Easing } from "react-native";

export const inputAnimations = {
  focus: {
    borderWidth: 2,
    shadowOpacity: 0.25,
    duration: 200,
  },
  labelFloat: {
    translateY: -24,
    scale: 0.85,
    duration: 200,
    easing: Easing.out(Easing.ease),
  },
  blur: {
    borderWidth: 1,
    shadowOpacity: 0.1,
    duration: 200,
  },
  labelSink: {
    translateY: 0,
    scale: 1.0,
    duration: 200,
    easing: Easing.out(Easing.ease),
  },
};

export const animateInputFocus = (
  borderWidthValue: Animated.Value,
  labelTranslateY: Animated.Value,
  labelScale: Animated.Value,
  shadowOpacityValue?: Animated.Value,
) => {
  const animations: Animated.CompositeAnimation[] = [
    Animated.timing(borderWidthValue, {
      toValue: inputAnimations.focus.borderWidth,
      duration: inputAnimations.focus.duration,
      useNativeDriver: false,
    }),
    Animated.timing(labelTranslateY, {
      toValue: inputAnimations.labelFloat.translateY,
      duration: inputAnimations.labelFloat.duration,
      easing: inputAnimations.labelFloat.easing,
      useNativeDriver: true,
    }),
    Animated.timing(labelScale, {
      toValue: inputAnimations.labelFloat.scale,
      duration: inputAnimations.labelFloat.duration,
      easing: inputAnimations.labelFloat.easing,
      useNativeDriver: true,
    }),
  ];

  if (shadowOpacityValue) {
    animations.push(
      Animated.timing(shadowOpacityValue, {
        toValue: inputAnimations.focus.shadowOpacity,
        duration: inputAnimations.focus.duration,
        useNativeDriver: true,
      }),
    );
  }

  Animated.parallel(animations).start();
};

export const animateInputBlur = (
  borderWidthValue: Animated.Value,
  labelTranslateY: Animated.Value,
  labelScale: Animated.Value,
  isEmpty: boolean,
  shadowOpacityValue?: Animated.Value,
) => {
  const animations: Animated.CompositeAnimation[] = [
    Animated.timing(borderWidthValue, {
      toValue: inputAnimations.blur.borderWidth,
      duration: inputAnimations.blur.duration,
      useNativeDriver: false,
    }),
  ];

  if (isEmpty) {
    animations.push(
      Animated.timing(labelTranslateY, {
        toValue: inputAnimations.labelSink.translateY,
        duration: inputAnimations.labelSink.duration,
        easing: inputAnimations.labelSink.easing,
        useNativeDriver: true,
      }),
      Animated.timing(labelScale, {
        toValue: inputAnimations.labelSink.scale,
        duration: inputAnimations.labelSink.duration,
        easing: inputAnimations.labelSink.easing,
        useNativeDriver: true,
      }),
    );
  }

  if (shadowOpacityValue) {
    animations.push(
      Animated.timing(shadowOpacityValue, {
        toValue: inputAnimations.blur.shadowOpacity,
        duration: inputAnimations.blur.duration,
        useNativeDriver: true,
      }),
    );
  }

  Animated.parallel(animations).start();
};
