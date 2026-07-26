import { Vibration, Platform } from "react-native";
import * as Haptics from "expo-haptics";

export type HapticType =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "selection";

export class HapticFeedback {
  private static isEnabled = true;

  static setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  static trigger(type: HapticType = "light") {
    if (!this.isEnabled) return;
    if (Platform.OS === "web") return;

    if (Platform.OS === "ios") {
      // Use expo-haptics on iOS — Vibration.vibrate() on iOS ignores the
      // duration argument and always vibrates 400ms, which made per-type
      // durations (selection/light/error) indistinguishable. expo-haptics
      // maps to the real iOS haptic engine (UIImpactFeedbackGenerator /
      // UINotificationFeedbackGenerator).
      this.triggerIOS(type);
    } else if (Platform.OS === "android") {
      this.triggerAndroid(type);
    }
  }

  private static triggerIOS(type: HapticType) {
    try {
      switch (type) {
        case "light":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case "success":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "warning":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "error":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case "selection":
          Haptics.selectionAsync();
          break;
      }
    } catch {
      // Haptics are non-critical — silently ignore.
    }
  }

  private static triggerAndroid(type: HapticType) {
    switch (type) {
      case "light":
        Vibration.vibrate(25);
        break;
      case "medium":
        Vibration.vibrate(50);
        break;
      case "heavy":
        Vibration.vibrate(100);
        break;
      case "success":
        Vibration.vibrate([25, 50, 25]);
        break;
      case "warning":
        Vibration.vibrate([50, 100]);
        break;
      case "error":
        Vibration.vibrate([100, 50, 100]);
        break;
      case "selection":
        Vibration.vibrate(10);
        break;
    }
  }

  // Convenience methods
  static light() {
    this.trigger("light");
  }

  static medium() {
    this.trigger("medium");
  }

  static heavy() {
    this.trigger("heavy");
  }

  static success() {
    this.trigger("success");
  }

  static warning() {
    this.trigger("warning");
  }

  static error() {
    this.trigger("error");
  }

  static selection() {
    this.trigger("selection");
  }
}

// React Hook for haptic feedback
export const useHapticFeedback = () => {
  return {
    trigger: HapticFeedback.trigger,
    light: HapticFeedback.light,
    medium: HapticFeedback.medium,
    heavy: HapticFeedback.heavy,
    success: HapticFeedback.success,
    warning: HapticFeedback.warning,
    error: HapticFeedback.error,
    selection: HapticFeedback.selection,
    setEnabled: HapticFeedback.setEnabled,
  };
};
