import { Animated } from "react-native";

/**
 * Common animation configuration types
 */

export interface SpringConfig {
  damping: number;
  stiffness: number;
}

export interface TimingConfig {
  duration: number;
  easing?: (value: number) => number;
}

export interface ButtonAnimationConfig {
  press: {
    scale: number;
    duration: number;
    easing: (value: number) => number;
  };
  release: {
    scale: number;
    spring: SpringConfig;
  };
}

export interface CardAnimationConfig {
  lift: {
    translateY: number;
    shadowOpacity: number;
    duration: number;
    easing: (value: number) => number;
  };
  rest: {
    translateY: number;
    shadowOpacity: number;
    spring: SpringConfig;
  };
}

export interface InputAnimationConfig {
  focus: {
    borderWidth: number;
    shadowOpacity: number;
    duration: number;
  };
  labelFloat: {
    translateY: number;
    scale: number;
    duration: number;
    easing: (value: number) => number;
  };
  blur: {
    borderWidth: number;
    shadowOpacity: number;
    duration: number;
  };
  labelSink: {
    translateY: number;
    scale: number;
    duration: number;
    easing: (value: number) => number;
  };
}

export interface PageTransitionConfig {
  slideInRight: {
    from: { translateX: number };
    to: { translateX: number };
    duration: number;
    easing: (value: number) => number;
  };
  slideOutLeft: {
    from: { translateX: number };
    to: { translateX: number };
    duration: number;
    easing: (value: number) => number;
  };
  fade: {
    from: { opacity: number };
    to: { opacity: number };
    duration: number;
  };
}

export interface ProgressAnimationConfig {
  linear: TimingConfig;
  circular: TimingConfig;
}

export interface TabAnimationConfig {
  indicatorMorph: {
    spring: SpringConfig;
  };
}

export interface SuccessAnimationConfig {
  checkmarkDraw: TimingConfig;
  celebration: {
    scaleDuration: number;
    fadeOutDelay: number;
    fadeOutDuration: number;
  };
}
