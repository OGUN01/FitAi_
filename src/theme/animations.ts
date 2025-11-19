/**
 * Aurora Animation System
 * Animation constants, easing functions, and common animation sequences
 * Designed for 60-120fps performance with React Native Reanimated 3
 */

import { Easing } from 'react-native-reanimated';

// Animation Durations (in milliseconds)
export const duration = {
  instant: 100,
  quick: 200,
  normal: 300,
  slow: 500,
  verySlow: 800,
} as const;

// Easing Functions for Reanimated
export const easingFunctions = {
  // Standard easing curves
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),

  // Cubic bezier curves
  easeInCubic: Easing.bezier(0.4, 0, 1, 1),
  easeOutCubic: Easing.bezier(0, 0, 0.2, 1),
  easeInOutCubic: Easing.bezier(0.4, 0, 0.2, 1),

  // Specialized curves
  sharp: Easing.bezier(0.4, 0, 0.6, 1),
  smooth: Easing.bezier(0.25, 0.1, 0.25, 1),
  bounce: Easing.bounce,
  elastic: Easing.elastic(1),
} as const;

// Spring Configurations
export const springConfig = {
  default: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },
  bounce: {
    damping: 10,
    stiffness: 80,
    mass: 1,
  },
  smooth: {
    damping: 20,
    stiffness: 120,
    mass: 1,
  },
  gentle: {
    damping: 25,
    stiffness: 140,
    mass: 1,
  },
  snappy: {
    damping: 12,
    stiffness: 150,
    mass: 0.8,
  },
  slow: {
    damping: 30,
    stiffness: 80,
    mass: 1.2,
  },
} as const;

// Scale Animation Values
export const scale = {
  press: 0.95,
  default: 1.0,
  hover: 1.02,
  active: 1.05,
} as const;

// Opacity Animation Values
export const opacity = {
  hidden: 0,
  visible: 1,
  dimmed: 0.6,
  subtle: 0.4,
} as const;

// Translation Animation Values (in pixels)
export const translate = {
  small: 4,
  medium: 8,
  large: 16,
  xlarge: 32,
} as const;

// Rotation Animation Values (in degrees)
export const rotation = {
  quarter: 90,
  half: 180,
  threeQuarter: 270,
  full: 360,
} as const;

// Common Animation Sequences

/**
 * Button Press Animation
 * Quick scale down with spring back
 */
export const buttonPressAnimation = {
  scale: scale.press,
  duration: duration.instant,
  easing: easingFunctions.easeOut,
};

export const buttonReleaseAnimation = {
  scale: scale.default,
  spring: springConfig.default,
};

/**
 * Card Lift Animation
 * Elevation increase on press
 */
export const cardLiftAnimation = {
  translateY: -translate.small,
  duration: duration.quick,
  easing: easingFunctions.easeOut,
};

export const cardRestAnimation = {
  translateY: 0,
  spring: springConfig.smooth,
};

/**
 * Fade In/Out Animations
 */
export const fadeIn = {
  from: { opacity: opacity.hidden },
  to: { opacity: opacity.visible },
  duration: duration.quick,
  easing: easingFunctions.easeOut,
};

export const fadeOut = {
  from: { opacity: opacity.visible },
  to: { opacity: opacity.hidden },
  duration: duration.quick,
  easing: easingFunctions.easeIn,
};

/**
 * Slide Animations
 */
export const slideInRight = {
  from: { translateX: 100 },
  to: { translateX: 0 },
  duration: duration.normal,
  easing: easingFunctions.easeOut,
};

export const slideInLeft = {
  from: { translateX: -100 },
  to: { translateX: 0 },
  duration: duration.normal,
  easing: easingFunctions.easeOut,
};

export const slideInUp = {
  from: { translateY: 100 },
  to: { translateY: 0 },
  duration: duration.normal,
  easing: easingFunctions.easeOut,
};

export const slideInDown = {
  from: { translateY: -100 },
  to: { translateY: 0 },
  duration: duration.normal,
  easing: easingFunctions.easeOut,
};

/**
 * Input Focus Animation
 */
export const inputFocusAnimation = {
  borderWidth: 2,
  duration: duration.quick,
  easing: easingFunctions.easeOut,
};

export const labelFloatAnimation = {
  translateY: -24,
  scale: 0.85,
  duration: duration.quick,
  easing: easingFunctions.easeOut,
};

/**
 * Progress Animations
 */
export const progressFillAnimation = {
  duration: duration.verySlow,
  easing: easingFunctions.easeOutCubic,
};

export const circularProgressAnimation = {
  duration: 1000,
  easing: easingFunctions.easeOutCubic,
};

/**
 * Tab Switch Animation
 */
export const tabIndicatorAnimation = {
  spring: springConfig.smooth,
};

/**
 * Loading Spinner Animation
 */
export const spinnerAnimation = {
  duration: 1200,
  easing: Easing.linear,
  loop: true,
};

/**
 * Pulse Animation
 * Continuous subtle scale for attention
 */
export const pulseAnimation = {
  scale: [1, 1.05, 1],
  duration: 2000,
  easing: easingFunctions.easeInOut,
  loop: true,
};

/**
 * Shimmer Animation
 * For skeleton loading states
 */
export const shimmerAnimation = {
  duration: 1500,
  easing: Easing.linear,
  loop: true,
};

/**
 * Success Checkmark Animation
 */
export const checkmarkDrawAnimation = {
  duration: 400,
  easing: easingFunctions.easeOut,
};

/**
 * Modal Animations
 */
export const modalBackdropAnimation = {
  from: { opacity: 0 },
  to: { opacity: 0.5 },
  duration: duration.normal,
  easing: easingFunctions.easeOut,
};

export const modalSlideUpAnimation = {
  from: { translateY: 300 },
  to: { translateY: 0 },
  spring: springConfig.default,
};

export const modalSlideDownAnimation = {
  from: { translateY: 0 },
  to: { translateY: 300 },
  duration: duration.normal,
  easing: easingFunctions.easeIn,
};

/**
 * Stagger Animation Config
 * For cascading entrance animations
 */
export const staggerConfig = {
  delay: 50, // ms between each item
  maxItems: 10, // maximum items to stagger
};

/**
 * Gesture Animation Thresholds
 */
export const gestureThresholds = {
  swipeVelocity: 500, // px/s
  swipeDistance: 50, // px
  longPressDuration: 500, // ms
  doubleTapDelay: 300, // ms
};

/**
 * Haptic Feedback Timing
 * Sync with animations for better UX
 */
export const hapticTiming = {
  onPress: 0, // immediate
  onRelease: duration.instant,
  onSuccess: duration.quick,
  onError: duration.quick,
};

// Export all animations as a single object
export const animations = {
  duration,
  easing: easingFunctions,
  spring: springConfig,
  scale,
  opacity,
  translate,
  rotation,
  sequences: {
    buttonPress: buttonPressAnimation,
    buttonRelease: buttonReleaseAnimation,
    cardLift: cardLiftAnimation,
    cardRest: cardRestAnimation,
    fadeIn,
    fadeOut,
    slideInRight,
    slideInLeft,
    slideInUp,
    slideInDown,
    inputFocus: inputFocusAnimation,
    labelFloat: labelFloatAnimation,
    progressFill: progressFillAnimation,
    circularProgress: circularProgressAnimation,
    tabIndicator: tabIndicatorAnimation,
    spinner: spinnerAnimation,
    pulse: pulseAnimation,
    shimmer: shimmerAnimation,
    checkmarkDraw: checkmarkDrawAnimation,
    modalBackdrop: modalBackdropAnimation,
    modalSlideUp: modalSlideUpAnimation,
    modalSlideDown: modalSlideDownAnimation,
  },
  stagger: staggerConfig,
  gesture: gestureThresholds,
  haptic: hapticTiming,
} as const;

// Type exports
export type Animations = typeof animations;
export type SpringConfig = typeof springConfig;
export type EasingFunctions = typeof easingFunctions;
