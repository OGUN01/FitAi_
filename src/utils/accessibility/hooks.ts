import { AccessibilityInfo } from "react-native";
import { useEffect, useState } from "react";

export const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        setReducedMotion(enabled);
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reducedMotion;
};

export const getAccessibleDuration = (
  normalDuration: number,
  reducedMotion: boolean,
  instantWhenReduced: boolean = false,
): number => {
  if (!reducedMotion) {
    return normalDuration;
  }

  return instantWhenReduced ? 0 : Math.min(normalDuration, 200);
};

export const shouldDisableAnimations = async (): Promise<boolean> => {
  return await AccessibilityInfo.isReduceMotionEnabled();
};

export const useScreenReader = (): boolean => {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      setScreenReaderEnabled(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      (enabled) => {
        setScreenReaderEnabled(enabled);
      },
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return screenReaderEnabled;
};
