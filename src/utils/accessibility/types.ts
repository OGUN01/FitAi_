/**
 * Accessibility Types
 * Type definitions for accessibility utilities
 */

export interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?:
    | "none"
    | "button"
    | "link"
    | "search"
    | "image"
    | "keyboardkey"
    | "text"
    | "adjustable"
    | "imagebutton"
    | "header"
    | "summary"
    | "alert"
    | "checkbox"
    | "combobox"
    | "menu"
    | "menubar"
    | "menuitem"
    | "progressbar"
    | "radio"
    | "radiogroup"
    | "scrollbar"
    | "spinbutton"
    | "switch"
    | "tab"
    | "tablist"
    | "timer"
    | "toolbar";
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | "mixed";
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
  accessibilityLiveRegion?: "none" | "polite" | "assertive";
  accessibilityElementsHidden?: boolean;
  importantForAccessibility?: "auto" | "yes" | "no" | "no-hide-descendants";
}

export type WCAGLevel = "AA" | "AAA";

export interface ColorContrastResult {
  ratio: number;
  requiredRatio: number;
  level: WCAGLevel;
  isLargeText: boolean;
  passes: boolean;
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
