/**
 * Cross-Platform Alert Utility
 *
 * Provides a unified alert API that works on iOS, Android, and Web.
 * - Native (iOS/Android): Delegates to React Native's Alert.alert
 * - Web: Uses window.alert() for info dialogs, window.confirm() for confirm dialogs
 */

import { Alert, Platform } from "react-native";

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type AlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
};

/**
 * Show a cross-platform alert dialog.
 *
 * @param title - Alert title
 * @param message - Alert message (optional)
 * @param buttons - Array of buttons (optional). If omitted or single button, uses window.alert on web.
 *                  If 2+ buttons, uses window.confirm on web.
 * @param options - Additional options (optional)
 */
export function crossPlatformAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
): void {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons, options);
    return;
  }

  // Web implementation
  const fullMessage = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length === 0) {
    // No buttons: simple info alert
    window.alert(fullMessage);
    return;
  }

  if (buttons.length === 1) {
    // Single button: info alert, then call onPress
    window.alert(fullMessage);
    buttons[0].onPress?.();
    return;
  }

  // 2+ buttons: use confirm dialog
  // Find the "action" button (non-cancel) and the cancel button
  const cancelButton = buttons.find((b) => b.style === "cancel");
  const actionButton =
    buttons.find((b) => b.style !== "cancel") || buttons[buttons.length - 1];

  const confirmed = window.confirm(fullMessage);

  if (confirmed) {
    // Use setTimeout to allow any nested crossPlatformAlert calls to fire
    // after the current confirm dialog closes (avoids swallowed dialogs)
    if (actionButton?.onPress) {
      setTimeout(() => actionButton.onPress?.(), 50);
    }
  } else {
    if (cancelButton?.onPress) {
      setTimeout(() => cancelButton.onPress?.(), 50);
    }
  }
}
