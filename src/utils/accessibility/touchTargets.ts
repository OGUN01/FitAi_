import { Platform } from "react-native";
import type { TouchTargetConfig } from "./types";

// Defensive Platform access: some test suites mock `react-native` minimally
// without exporting `Platform`. NOTE: this module is NOT currently imported
// by AnimatedPressable or any other component — AnimatedPressable only pulls
// `useReducedMotion`/`getAccessibleDuration` from `accessibility/hooks` and
// still uses a static `DEFAULT_PRESS_RETENTION_OFFSET`. These exports
// (calculateHitSlop/ensureTouchTargetSize/getMinTouchTargetSize) are unused
// scaffolding pending adoption — wire them into AnimatedPressable's hitSlop
// logic to actually enforce the 44pt/48dp minimum touch target. The
// defensive guard below is kept anyway, mirroring `theme/aurora-tokens.ts`,
// so this module is safe to adopt without a follow-up hardening pass.
const platformOS = typeof Platform !== "undefined" ? Platform?.OS : undefined;

export const TOUCH_TARGET_SIZES = {
  iOS: {
    minWidth: 44,
    minHeight: 44,
  },
  Android: {
    minWidth: 48,
    minHeight: 48,
  },
  minimum: {
    minWidth: platformOS === "ios" ? 44 : 48,
    minHeight: platformOS === "ios" ? 44 : 48,
  },
} as const;

export const getMinTouchTargetSize = (): TouchTargetConfig => {
  return TOUCH_TARGET_SIZES.minimum;
};

export const calculateHitSlop = (
  actualWidth: number,
  actualHeight: number,
): { top: number; bottom: number; left: number; right: number } => {
  const minSize = getMinTouchTargetSize();

  const horizontalSlop = Math.max(0, (minSize.minWidth - actualWidth) / 2);
  const verticalSlop = Math.max(0, (minSize.minHeight - actualHeight) / 2);

  return {
    top: verticalSlop,
    bottom: verticalSlop,
    left: horizontalSlop,
    right: horizontalSlop,
  };
};

export const ensureTouchTargetSize = (
  width: number,
  height: number,
): {
  width: number;
  height: number;
  hitSlop?: { top: number; bottom: number; left: number; right: number };
} => {
  const minSize = getMinTouchTargetSize();

  if (width >= minSize.minWidth && height >= minSize.minHeight) {
    return { width, height };
  }

  return {
    width,
    height,
    hitSlop: calculateHitSlop(width, height),
  };
};
