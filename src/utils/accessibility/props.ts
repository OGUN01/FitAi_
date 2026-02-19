import { Platform, AccessibilityInfo } from "react-native";
import type { AccessibilityProps } from "./types";

export const buttonA11yProps = (
  label: string,
  hint?: string,
  disabled?: boolean,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRole: "button",
  accessibilityState: { disabled: disabled || false },
  accessible: true,
});

export const linkA11yProps = (
  label: string,
  hint?: string,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityHint: hint,
  accessibilityRole: "link",
  accessible: true,
});

export const imageA11yProps = (
  label: string,
  decorative: boolean = false,
): AccessibilityProps => {
  if (decorative) {
    return {
      accessible: false,
      accessibilityElementsHidden: true,
      importantForAccessibility: "no-hide-descendants",
    };
  }

  return {
    accessibilityLabel: label,
    accessibilityRole: "image",
    accessible: true,
  };
};

export const headingA11yProps = (
  label: string,
  level?: number,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: "header",
  accessible: true,
  ...(Platform.OS === "ios" &&
    level && {
      accessibilityTraits: [`header`, `heading${level}`],
    }),
});

export const checkboxA11yProps = (
  label: string,
  checked: boolean,
  disabled?: boolean,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: "checkbox",
  accessibilityState: {
    checked,
    disabled: disabled || false,
  },
  accessible: true,
});

export const switchA11yProps = (
  label: string,
  checked: boolean,
  disabled?: boolean,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: "switch",
  accessibilityState: {
    checked,
    disabled: disabled || false,
  },
  accessible: true,
});

export const radioA11yProps = (
  label: string,
  selected: boolean,
  disabled?: boolean,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: "radio",
  accessibilityState: {
    selected,
    disabled: disabled || false,
  },
  accessible: true,
});

export const tabA11yProps = (
  label: string,
  selected: boolean,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: "tab",
  accessibilityState: {
    selected,
  },
  accessible: true,
});

export const progressA11yProps = (
  label: string,
  value: number,
  min: number = 0,
  max: number = 100,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: "progressbar",
  accessibilityValue: {
    min,
    max,
    now: value,
    text: `${Math.round((value / max) * 100)}% complete`,
  },
  accessible: true,
});

export const sliderA11yProps = (
  label: string,
  value: number,
  min: number = 0,
  max: number = 100,
  unit?: string,
): AccessibilityProps => ({
  accessibilityLabel: label,
  accessibilityRole: "adjustable",
  accessibilityValue: {
    min,
    max,
    now: value,
    text: unit ? `${value} ${unit}` : `${value}`,
  },
  accessible: true,
});

export const alertA11yProps = (
  message: string,
  assertive: boolean = false,
): AccessibilityProps => ({
  accessibilityLabel: message,
  accessibilityRole: "alert",
  accessibilityLiveRegion: assertive ? "assertive" : "polite",
  accessible: true,
});

export const announceForAccessibility = (message: string): void => {
  AccessibilityInfo.announceForAccessibility(message);
};
