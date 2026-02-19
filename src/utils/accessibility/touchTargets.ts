import { Platform } from "react-native";
import type { TouchTargetConfig } from "./types";

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
    minWidth: Platform.OS === "ios" ? 44 : 48,
    minHeight: Platform.OS === "ios" ? 44 : 48,
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
