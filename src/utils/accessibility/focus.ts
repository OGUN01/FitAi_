import { AccessibilityInfo } from "react-native";

export const setAccessibilityFocus = (reactTag: number): void => {
  AccessibilityInfo.setAccessibilityFocus(reactTag);
};
