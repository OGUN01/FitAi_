/**
 * Performance Optimization Utilities
 * Provides debouncing, throttling, and async scheduling tools
 */

import { InteractionManager } from "react-native";

// ============================================================================
// DEBOUNCING UTILITIES
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ============================================================================
// ASYNC OPTIMIZATION
// ============================================================================

export function runAfterInteractions<T>(callback: () => T): Promise<T> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      resolve(callback());
    });
  });
}

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export default {
  debounce,
  throttle,
  runAfterInteractions,
};
