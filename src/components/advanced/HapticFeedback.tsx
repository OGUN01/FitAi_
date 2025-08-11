import { Vibration, Platform } from 'react-native';

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

export class HapticFeedback {
  private static isEnabled = true;

  static setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  static trigger(type: HapticType = 'light') {
    if (!this.isEnabled) return;

    if (Platform.OS === 'ios') {
      // iOS has more sophisticated haptic feedback
      this.triggerIOS(type);
    } else if (Platform.OS === 'android') {
      // Android uses vibration patterns
      this.triggerAndroid(type);
    }
  }

  private static triggerIOS(type: HapticType) {
    // Note: In a real app, you'd use react-native-haptic-feedback
    // For now, we'll use basic vibration
    switch (type) {
      case 'light':
        Vibration.vibrate(10);
        break;
      case 'medium':
        Vibration.vibrate(20);
        break;
      case 'heavy':
        Vibration.vibrate(50);
        break;
      case 'success':
        Vibration.vibrate([10, 50, 10]);
        break;
      case 'warning':
        Vibration.vibrate([20, 100]);
        break;
      case 'error':
        Vibration.vibrate([50, 50, 50]);
        break;
      case 'selection':
        Vibration.vibrate(5);
        break;
    }
  }

  private static triggerAndroid(type: HapticType) {
    switch (type) {
      case 'light':
        Vibration.vibrate(25);
        break;
      case 'medium':
        Vibration.vibrate(50);
        break;
      case 'heavy':
        Vibration.vibrate(100);
        break;
      case 'success':
        Vibration.vibrate([25, 50, 25]);
        break;
      case 'warning':
        Vibration.vibrate([50, 100]);
        break;
      case 'error':
        Vibration.vibrate([100, 50, 100]);
        break;
      case 'selection':
        Vibration.vibrate(10);
        break;
    }
  }

  // Convenience methods
  static light() {
    this.trigger('light');
  }

  static medium() {
    this.trigger('medium');
  }

  static heavy() {
    this.trigger('heavy');
  }

  static success() {
    this.trigger('success');
  }

  static warning() {
    this.trigger('warning');
  }

  static error() {
    this.trigger('error');
  }

  static selection() {
    this.trigger('selection');
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
