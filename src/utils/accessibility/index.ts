/**
 * Accessibility Utilities
 * Comprehensive accessibility support for React Native
 * WCAG AAA compliant (7:1 contrast ratio)
 */

import { AccessibilityInfo, Platform } from 'react-native';
import { useEffect, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?:
    | 'none'
    | 'button'
    | 'link'
    | 'search'
    | 'image'
    | 'keyboardkey'
    | 'text'
    | 'adjustable'
    | 'imagebutton'
    | 'header'
    | 'summary'
    | 'alert'
    | 'checkbox'
    | 'combobox'
    | 'menu'
    | 'menubar'
    | 'menuitem'
    | 'progressbar'
    | 'radio'
    | 'radiogroup'
    | 'scrollbar'
    | 'spinbutton'
    | 'switch'
    | 'tab'
    | 'tablist'
    | 'timer'
    | 'toolbar';
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  accessible?: boolean;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
}

export interface ColorContrastResult {
  ratio: number;
  passes: {
    aa: boolean;
    aaa: boolean;
  };
}

export interface TouchTargetConfig {
  minWidth: number;
  minHeight: number;
  hitSlop?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

// ============================================================================
// SCREEN READER SUPPORT
// ============================================================================

/**
 * Create accessibility props for buttons
 */
export const buttonA11yProps = (
  label: string,
  hint?: string,
  disabled?: boolean
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRole: 'button',
  accessibilityState: { disabled: disabled || false },
  accessible: true,
});

/**
 * Create accessibility props for links
 */
export const linkA11yProps = (
  label: string,
  hint?: string
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRole: 'link',
  accessible: true,
});

/**
 * Create accessibility props for images
 */
export const imageA11yProps = (
  label: string,
  decorative: boolean = false
): AccessibilityProps => {
  if (decorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: 'no-hide-descendants',
    };
  }

  return {
    accessibilityLabel: label,
    accessibilityRole: 'image',
    accessible: true,
  };
};

/**
 * Create accessibility props for headings
 */
export const headingA11yProps = (
  label: string,
  level?: number
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: 'header',
  accessible: true,
  ...(Platform.OS === 'ios' &&
    level && {
      accessibilityTraits: [`header`, `heading${level}`],
    }),
});

/**
 * Create accessibility props for checkboxes
 */
export const checkboxA11yProps = (
  label: string,
  checked: boolean,
  disabled?: boolean
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: 'checkbox',
  accessibilityState: {
    checked,
    disabled: disabled || false,
  },
  accessible: true,
});

/**
 * Create accessibility props for switches/toggles
 */
export const switchA11yProps = (
  label: string,
  checked: boolean,
  disabled?: boolean
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: 'switch',
  accessibilityState: {
    checked,
    disabled: disabled || false,
  },
  accessible: true,
});

/**
 * Create accessibility props for radio buttons
 */
export const radioA11yProps = (
  label: string,
  selected: boolean,
  disabled?: boolean
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: 'radio',
  accessibilityState: {
    selected,
    disabled: disabled || false,
  },
  accessible: true,
});

/**
 * Create accessibility props for tabs
 */
export const tabA11yProps = (
  label: string,
  selected: boolean
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: 'tab',
  accessibilityState: {
    selected,
  },
  accessible: true,
});

/**
 * Create accessibility props for progress indicators
 */
export const progressA11yProps = (
  label: string,
  value: number,
  min: number = 0,
  max: number = 100
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: 'progressbar',
  accessibilityValue: {
    min,
    max,
    now: value,
    text: `${Math.round((value / max) * 100)}% complete`,
  },
  accessible: true,
});

/**
 * Create accessibility props for sliders/adjustables
 */
export const sliderA11yProps = (
  label: string,
  value: number,
  min: number = 0,
  max: number = 100,
  unit?: string
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: 'adjustable',
  accessibilityValue: {
    min,
    max,
    now: value,
    text: unit ? `${value} ${unit}` : `${value}`,
  },
  accessible: true,
});

/**
 * Create accessibility props for alerts
 */
export const alertA11yProps = (
  message: string,
  assertive: boolean = false
): AccessibilityProps => ({
  accessibilityLabel: message,
  accessibilityRole: 'alert',
  accessibilityLiveRegion: assertive ? 'assertive' : 'polite',
  accessible: true,
});

/**
 * Announce message to screen reader
 */
export const announceForAccessibility = (message: string): void => {
  AccessibilityInfo.announceForAccessibility(message);
};

// ============================================================================
// COLOR CONTRAST
// ============================================================================

/**
 * Calculate relative luminance of RGB color
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
const getRelativeLuminance = (r: number, g: number, b: number): number => {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear =
    rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear =
    gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear =
    bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

/**
 * Parse hex color to RGB
 */
const hexToRgb = (
  hex: string
): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Calculate contrast ratio between two colors
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
export const getContrastRatio = (
  color1: string,
  color2: string
): ColorContrastResult => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid hex color format');
  }

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);

  return {
    ratio,
    passes: {
      aa: ratio >= 4.5, // WCAG AA (normal text: 4.5:1, large text: 3:1)
      aaa: ratio >= 7.0, // WCAG AAA (normal text: 7:1, large text: 4.5:1)
    },
  };
};

/**
 * Check if color combination meets WCAG AAA standards
 */
export const meetsWCAG_AAA = (
  foreground: string,
  background: string
): boolean => {
  const result = getContrastRatio(foreground, background);
  return result.passes.aaa;
};

/**
 * Check if color combination meets WCAG AA standards
 */
export const meetsWCAG_AA = (
  foreground: string,
  background: string
): boolean => {
  const result = getContrastRatio(foreground, background);
  return result.passes.aa;
};

/**
 * Validate color contrast for text on background
 */
export const validateTextContrast = (
  textColor: string,
  backgroundColor: string,
  isLargeText: boolean = false
): {
  valid: boolean;
  ratio: number;
  requiredRatio: number;
} => {
  const result = getContrastRatio(textColor, backgroundColor);
  const requiredRatio = isLargeText ? 4.5 : 7.0; // AAA standards

  return {
    valid: result.ratio >= requiredRatio,
    ratio: result.ratio,
    requiredRatio,
  };
};

// ============================================================================
// TOUCH TARGET SIZES
// ============================================================================

/**
 * Minimum touch target sizes (WCAG 2.5.5)
 */
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
    minWidth: Platform.OS === 'ios' ? 44 : 48,
    minHeight: Platform.OS === 'ios' ? 44 : 48,
  },
} as const;

/**
 * Get minimum touch target size for current platform
 */
export const getMinTouchTargetSize = (): TouchTargetConfig => {
  return TOUCH_TARGET_SIZES.minimum;
};

/**
 * Calculate hit slop to meet minimum touch target size
 */
export const calculateHitSlop = (
  actualWidth: number,
  actualHeight: number
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

/**
 * Ensure element meets minimum touch target size
 */
export const ensureTouchTargetSize = (
  width: number,
  height: number
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

// ============================================================================
// REDUCE MOTION SUPPORT
// ============================================================================

/**
 * Hook to detect if user prefers reduced motion
 */
export const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled);
    });

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => {
        setReducedMotion(enabled);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reducedMotion;
};

/**
 * Get animation duration adjusted for reduce motion preference
 */
export const getAccessibleDuration = (
  normalDuration: number,
  reducedMotion: boolean,
  instantWhenReduced: boolean = false
): number => {
  if (!reducedMotion) {
    return normalDuration;
  }

  return instantWhenReduced ? 0 : Math.min(normalDuration, 200);
};

/**
 * Check if animations should be disabled
 */
export const shouldDisableAnimations = async (): Promise<boolean> => {
  return await AccessibilityInfo.isReduceMotionEnabled();
};

// ============================================================================
// SCREEN READER DETECTION
// ============================================================================

/**
 * Hook to detect if screen reader is enabled
 */
export const useScreenReader = (): boolean => {
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);

  useEffect(() => {
    // Check initial state
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      setScreenReaderEnabled(enabled);
    });

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (enabled) => {
        setScreenReaderEnabled(enabled);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return screenReaderEnabled;
};

// ============================================================================
// FOCUS MANAGEMENT
// ============================================================================

/**
 * Set accessibility focus to an element
 */
export const setAccessibilityFocus = (reactTag: number): void => {
  AccessibilityInfo.setAccessibilityFocus(reactTag);
};

// ============================================================================
// EXPORTS
// ============================================================================

export const accessibility = {
  // Screen reader props helpers
  button: buttonA11yProps,
  link: linkA11yProps,
  image: imageA11yProps,
  heading: headingA11yProps,
  checkbox: checkboxA11yProps,
  switch: switchA11yProps,
  radio: radioA11yProps,
  tab: tabA11yProps,
  progress: progressA11yProps,
  slider: sliderA11yProps,
  alert: alertA11yProps,
  announce: announceForAccessibility,

  // Color contrast
  getContrastRatio,
  meetsWCAG_AAA,
  meetsWCAG_AA,
  validateTextContrast,

  // Touch targets
  TOUCH_TARGET_SIZES,
  getMinTouchTargetSize,
  calculateHitSlop,
  ensureTouchTargetSize,

  // Reduce motion
  shouldDisableAnimations,
  getAccessibleDuration,

  // Focus management
  setAccessibilityFocus,
} as const;

export default accessibility;
