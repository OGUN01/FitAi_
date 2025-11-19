/**
 * Haptic Feedback System
 * Provides tactile feedback for user interactions
 * Synced with Aurora animation system for enhanced UX
 */

import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export type HapticType =
  | 'selection'
  | 'success'
  | 'warning'
  | 'error'
  | 'light'
  | 'medium'
  | 'heavy';

export interface HapticConfig {
  enabled: boolean;
  intensity?: number; // 0-1, future use
}

// ============================================================================
// CONFIGURATION
// ============================================================================

let hapticConfig: HapticConfig = {
  enabled: true,
  intensity: 1.0,
};

/**
 * Configure haptic feedback globally
 */
export const configureHaptics = (config: Partial<HapticConfig>): void => {
  hapticConfig = { ...hapticConfig, ...config };
};

/**
 * Enable haptic feedback
 */
export const enableHaptics = (): void => {
  hapticConfig.enabled = true;
};

/**
 * Disable haptic feedback
 */
export const disableHaptics = (): void => {
  hapticConfig.enabled = false;
};

/**
 * Check if haptics are enabled
 */
export const areHapticsEnabled = (): boolean => {
  return hapticConfig.enabled && Platform.OS !== 'web';
};

// ============================================================================
// HAPTIC FEEDBACK FUNCTIONS
// ============================================================================

/**
 * Light selection feedback
 * Use for: Chip selection, toggle switch, radio/checkbox selection
 */
export const hapticSelection = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.warn('Haptic selection failed:', error);
  }
};

/**
 * Success notification feedback
 * Use for: Form submission, workout completion, achievement unlocked
 */
export const hapticSuccess = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (error) {
    console.warn('Haptic success failed:', error);
  }
};

/**
 * Warning notification feedback
 * Use for: Validation errors, threshold reached
 */
export const hapticWarning = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.warn('Haptic warning failed:', error);
  }
};

/**
 * Error notification feedback
 * Use for: Action failed, invalid input
 */
export const hapticError = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.warn('Haptic error failed:', error);
  }
};

/**
 * Light impact feedback
 * Use for: Small UI interactions, subtle confirmations
 */
export const hapticLight = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (error) {
    console.warn('Haptic light impact failed:', error);
  }
};

/**
 * Medium impact feedback
 * Use for: Button press (primary actions), card selection
 */
export const hapticMedium = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (error) {
    console.warn('Haptic medium impact failed:', error);
  }
};

/**
 * Heavy impact feedback
 * Use for: Pull to refresh complete, delete action, major state changes
 */
export const hapticHeavy = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.warn('Haptic heavy impact failed:', error);
  }
};

// ============================================================================
// CONVENIENCE FUNCTIONS FOR SPECIFIC USE CASES
// ============================================================================

/**
 * Button press feedback
 * Use for: All primary button interactions
 */
export const hapticButtonPress = hapticMedium;

/**
 * Card tap feedback
 * Use for: Card selection, navigation
 */
export const hapticCardTap = hapticLight;

/**
 * Toggle feedback
 * Use for: Switch toggles, checkbox, radio buttons
 */
export const hapticToggle = hapticSelection;

/**
 * Tab switch feedback
 * Use for: Tab navigation
 */
export const hapticTabSwitch = hapticSelection;

/**
 * Delete feedback
 * Use for: Destructive actions
 */
export const hapticDelete = hapticHeavy;

/**
 * Pull to refresh complete feedback
 * Use for: When pull to refresh successfully completes
 */
export const hapticRefreshComplete = hapticHeavy;

/**
 * Form submit feedback
 * Use for: Successful form submissions
 */
export const hapticFormSubmit = hapticSuccess;

/**
 * Achievement unlocked feedback
 * Use for: Gamification, milestones
 */
export const hapticAchievement = hapticSuccess;

/**
 * Slider change feedback
 * Use for: Slider value changes
 */
export const hapticSliderChange = hapticSelection;

/**
 * Long press activated feedback
 * Use for: Long press context menu activation
 */
export const hapticLongPressActivated = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    // Double tap medium for emphasis
    await hapticMedium();
    setTimeout(() => hapticMedium(), 100);
  } catch (error) {
    console.warn('Haptic long press failed:', error);
  }
};

/**
 * Swipe action feedback
 * Use for: Swipe to delete, swipe to archive
 */
export const hapticSwipeAction = hapticMedium;

/**
 * Drag start feedback
 * Use for: Drag and drop initiation
 */
export const hapticDragStart = hapticMedium;

/**
 * Drag drop feedback
 * Use for: Successful drag and drop
 */
export const hapticDragDrop = hapticLight;

/**
 * Boundary reached feedback
 * Use for: Scroll limits, value limits
 */
export const hapticBoundary = hapticWarning;

/**
 * Celebration feedback sequence
 * Use for: Major achievements, workout completion
 */
export const hapticCelebration = async (): Promise<void> => {
  if (!areHapticsEnabled()) return;

  try {
    await hapticSuccess();
    setTimeout(() => hapticMedium(), 150);
    setTimeout(() => hapticLight(), 300);
  } catch (error) {
    console.warn('Haptic celebration failed:', error);
  }
};

// ============================================================================
// GENERIC HAPTIC TRIGGER
// ============================================================================

/**
 * Generic haptic trigger by type
 * Useful for configuration-driven haptics
 */
export const triggerHaptic = async (type: HapticType): Promise<void> => {
  switch (type) {
    case 'selection':
      return hapticSelection();
    case 'success':
      return hapticSuccess();
    case 'warning':
      return hapticWarning();
    case 'error':
      return hapticError();
    case 'light':
      return hapticLight();
    case 'medium':
      return hapticMedium();
    case 'heavy':
      return hapticHeavy();
    default:
      return hapticLight();
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const haptics = {
  // Configuration
  configure: configureHaptics,
  enable: enableHaptics,
  disable: disableHaptics,
  isEnabled: areHapticsEnabled,

  // Basic types
  selection: hapticSelection,
  success: hapticSuccess,
  warning: hapticWarning,
  error: hapticError,
  light: hapticLight,
  medium: hapticMedium,
  heavy: hapticHeavy,

  // Use case specific
  buttonPress: hapticButtonPress,
  cardTap: hapticCardTap,
  toggle: hapticToggle,
  tabSwitch: hapticTabSwitch,
  delete: hapticDelete,
  refreshComplete: hapticRefreshComplete,
  formSubmit: hapticFormSubmit,
  achievement: hapticAchievement,
  sliderChange: hapticSliderChange,
  longPress: hapticLongPressActivated,
  swipeAction: hapticSwipeAction,
  dragStart: hapticDragStart,
  dragDrop: hapticDragDrop,
  boundary: hapticBoundary,
  celebration: hapticCelebration,

  // Generic trigger
  trigger: triggerHaptic,
} as const;

export default haptics;
