import { Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

/**
 * Global Animation Library
 * Standardized animations for consistent micro-interactions throughout the app
 */

// ==================== BUTTON INTERACTIONS ====================

export const buttonAnimations = {
  /**
   * Press animation - scale down
   */
  press: {
    scale: 0.95,
    duration: 100,
    easing: Easing.out(Easing.ease),
  },

  /**
   * Release with spring - return to normal
   */
  release: {
    scale: 1.0,
    spring: {
      damping: 15,
      stiffness: 100,
    },
  },
};

/**
 * Animate button press and release
 */
export const animateButtonPress = (
  scaleValue: Animated.Value,
  onPressComplete?: () => void
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

// ==================== CARD INTERACTIONS ====================

export const cardAnimations = {
  /**
   * Elevation lift on press
   */
  lift: {
    translateY: -4,
    shadowOpacity: 0.3,
    duration: 200,
    easing: Easing.out(Easing.ease),
  },

  /**
   * Return to rest
   */
  rest: {
    translateY: 0,
    shadowOpacity: 0.2,
    spring: {
      damping: 12,
      stiffness: 80,
    },
  },
};

/**
 * Animate card lift on press
 */
export const animateCardLift = (
  translateYValue: Animated.Value,
  shadowOpacityValue?: Animated.Value
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
      })
    );
  }

  Animated.parallel(animations).start();
};

/**
 * Animate card return to rest
 */
export const animateCardRest = (
  translateYValue: Animated.Value,
  shadowOpacityValue?: Animated.Value
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
      })
    );
  }

  Animated.parallel(animations).start();
};

// ==================== INPUT INTERACTIONS ====================

export const inputAnimations = {
  /**
   * Focus animation
   */
  focus: {
    borderWidth: 2,
    shadowOpacity: 0.25,
    duration: 200,
  },

  /**
   * Label float animation
   */
  labelFloat: {
    translateY: -24,
    scale: 0.85,
    duration: 200,
    easing: Easing.out(Easing.ease),
  },

  /**
   * Blur animation
   */
  blur: {
    borderWidth: 1,
    shadowOpacity: 0.1,
    duration: 200,
  },

  /**
   * Label sink animation
   */
  labelSink: {
    translateY: 0,
    scale: 1.0,
    duration: 200,
    easing: Easing.out(Easing.ease),
  },
};

/**
 * Animate input focus with label float
 */
export const animateInputFocus = (
  borderWidthValue: Animated.Value,
  labelTranslateY: Animated.Value,
  labelScale: Animated.Value,
  shadowOpacityValue?: Animated.Value
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
      })
    );
  }

  Animated.parallel(animations).start();
};

/**
 * Animate input blur with label sink (if empty)
 */
export const animateInputBlur = (
  borderWidthValue: Animated.Value,
  labelTranslateY: Animated.Value,
  labelScale: Animated.Value,
  isEmpty: boolean,
  shadowOpacityValue?: Animated.Value
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
      })
    );
  }

  if (shadowOpacityValue) {
    animations.push(
      Animated.timing(shadowOpacityValue, {
        toValue: inputAnimations.blur.shadowOpacity,
        duration: inputAnimations.blur.duration,
        useNativeDriver: true,
      })
    );
  }

  Animated.parallel(animations).start();
};

// ==================== PAGE TRANSITIONS ====================

export const pageTransitions = {
  /**
   * Slide in from right
   */
  slideInRight: {
    from: { translateX: width },
    to: { translateX: 0 },
    duration: 300,
    easing: Easing.out(Easing.ease),
  },

  /**
   * Slide out to left
   */
  slideOutLeft: {
    from: { translateX: 0 },
    to: { translateX: -width },
    duration: 300,
    easing: Easing.in(Easing.ease),
  },

  /**
   * Fade transition
   */
  fade: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 200,
  },
};

/**
 * Animate page slide in from right
 */
export const animateSlideInRight = (
  translateXValue: Animated.Value,
  onComplete?: () => void
) => {
  translateXValue.setValue(pageTransitions.slideInRight.from.translateX);
  Animated.timing(translateXValue, {
    toValue: pageTransitions.slideInRight.to.translateX,
    duration: pageTransitions.slideInRight.duration,
    easing: pageTransitions.slideInRight.easing,
    useNativeDriver: true,
  }).start(onComplete);
};

/**
 * Animate page fade in
 */
export const animateFadeIn = (
  opacityValue: Animated.Value,
  onComplete?: () => void
) => {
  opacityValue.setValue(pageTransitions.fade.from.opacity);
  Animated.timing(opacityValue, {
    toValue: pageTransitions.fade.to.opacity,
    duration: pageTransitions.fade.duration,
    useNativeDriver: true,
  }).start(onComplete);
};

// ==================== NUMBER COUNTER ANIMATION ====================

/**
 * Count up animation for numeric values
 */
export const animateCountUp = (
  animatedValue: Animated.Value,
  from: number,
  to: number,
  duration: number = 1000,
  onUpdate?: (value: number) => void,
  decimals: number = 0
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

// ==================== PROGRESS ANIMATIONS ====================

export const progressAnimations = {
  /**
   * Linear progress fill
   */
  linear: {
    duration: 800,
    easing: Easing.out(Easing.cubic),
  },

  /**
   * Circular progress stroke
   */
  circular: {
    duration: 1000,
    easing: Easing.out(Easing.cubic),
  },
};

/**
 * Animate linear progress bar
 */
export const animateProgressFill = (
  widthValue: Animated.Value,
  percentage: number,
  onComplete?: () => void
) => {
  Animated.timing(widthValue, {
    toValue: percentage,
    duration: progressAnimations.linear.duration,
    easing: progressAnimations.linear.easing,
    useNativeDriver: false,
  }).start(onComplete);
};

/**
 * Animate circular progress
 */
export const animateCircularProgress = (
  strokeDashoffsetValue: Animated.Value,
  circumference: number,
  percentage: number,
  onComplete?: () => void
) => {
  const targetOffset = circumference * (1 - percentage / 100);

  Animated.timing(strokeDashoffsetValue, {
    toValue: targetOffset,
    duration: progressAnimations.circular.duration,
    easing: progressAnimations.circular.easing,
    useNativeDriver: false,
  }).start(onComplete);
};

// ==================== TAB SWITCH ANIMATION ====================

export const tabAnimations = {
  /**
   * Liquid morph indicator
   */
  indicatorMorph: {
    spring: {
      damping: 20,
      stiffness: 120,
    },
  },
};

/**
 * Animate tab indicator morph
 */
export const animateTabIndicator = (
  translateXValue: Animated.Value,
  widthValue: Animated.Value,
  targetPosition: number,
  targetWidth: number
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

// ==================== SUCCESS STATE ANIMATIONS ====================

export const successAnimations = {
  /**
   * Checkmark draw animation
   */
  checkmarkDraw: {
    duration: 400,
    easing: Easing.out(Easing.ease),
  },

  /**
   * Celebration burst
   */
  celebration: {
    scaleDuration: 600,
    fadeOutDelay: 400,
    fadeOutDuration: 200,
  },
};

/**
 * Animate checkmark draw (SVG path)
 */
export const animateCheckmarkDraw = (
  strokeDashoffsetValue: Animated.Value,
  pathLength: number,
  onComplete?: () => void
) => {
  strokeDashoffsetValue.setValue(pathLength);
  Animated.timing(strokeDashoffsetValue, {
    toValue: 0,
    duration: successAnimations.checkmarkDraw.duration,
    easing: successAnimations.checkmarkDraw.easing,
    useNativeDriver: false,
  }).start(onComplete);
};

/**
 * Animate celebration burst (scale + fade)
 */
export const animateCelebrationBurst = (
  scaleValue: Animated.Value,
  opacityValue: Animated.Value,
  onComplete?: () => void
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

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create a looping animation
 */
export const createLoopAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number,
  easing: ((value: number) => number) = Easing.inOut(Easing.ease)
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
    ])
  );
};

/**
 * Create a spring animation
 */
export const createSpringAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  damping: number = 15,
  stiffness: number = 100
): Animated.CompositeAnimation => {
  return Animated.spring(animatedValue, {
    toValue,
    damping,
    stiffness,
    useNativeDriver: true,
  });
};

/**
 * Create a timing animation
 */
export const createTimingAnimation = (
  animatedValue: Animated.Value,
  toValue: number,
  duration: number,
  easing: ((value: number) => number) = Easing.out(Easing.ease),
  useNativeDriver: boolean = true
): Animated.CompositeAnimation => {
  return Animated.timing(animatedValue, {
    toValue,
    duration,
    easing,
    useNativeDriver,
  });
};
