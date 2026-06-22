import { AccessibilityInfo } from "react-native";
import { useEffect, useState } from "react";

/**
 * Returns true when the OS "Reduce Motion" / "Remove Animations" accessibility
 * setting is enabled. Degrades gracefully to `false` (motion on) when
 * `AccessibilityInfo` is unavailable (partial RN mocks in tests, SSR) — never
 * throws. This is important because AuroraBackground (and other consumers) call
 * this on every render; a throw here would crash the host screen.
 */
export const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Guard: AccessibilityInfo can be undefined in partial RN test mocks or SSR.
    if (!AccessibilityInfo?.isReduceMotionEnabled) return;

    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (!cancelled) setReducedMotion(Boolean(enabled));
    }).catch(() => {
      // Probe failed — assume motion on (default). Non-fatal.
    });

    let subscription: { remove: () => void } | null = null;
    if (typeof AccessibilityInfo.addEventListener === "function") {
      subscription = AccessibilityInfo.addEventListener(
        "reduceMotionChanged",
        (enabled: boolean) => setReducedMotion(Boolean(enabled)),
      );
    }

    return () => {
      cancelled = true;
      subscription?.remove?.();
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
