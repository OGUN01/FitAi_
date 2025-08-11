/**
 * Accessibility Utilities
 * Provides comprehensive accessibility support for the profile editing system
 */

import { AccessibilityInfo, Platform } from 'react-native';

// ============================================================================
// ACCESSIBILITY CONSTANTS
// ============================================================================

export const AccessibilityRoles = {
  BUTTON: 'button' as const,
  TEXT: 'text' as const,
  HEADER: 'header' as const,
  TEXTINPUT: 'textinput' as const,
  SWITCH: 'switch' as const,
  CHECKBOX: 'checkbox' as const,
  RADIO: 'radio' as const,
  LINK: 'link' as const,
  IMAGE: 'image' as const,
  ALERT: 'alert' as const,
  PROGRESSBAR: 'progressbar' as const,
  TAB: 'tab' as const,
  TABLIST: 'tablist' as const,
  MENU: 'menu' as const,
  MENUITEM: 'menuitem' as const,
};

export const AccessibilityStates = {
  DISABLED: { disabled: true },
  SELECTED: { selected: true },
  CHECKED: { checked: true },
  EXPANDED: { expanded: true },
  BUSY: { busy: true },
};

export const AccessibilityTraits = {
  NONE: 'none' as const,
  BUTTON: 'button' as const,
  LINK: 'link' as const,
  HEADER: 'header' as const,
  SEARCH: 'search' as const,
  IMAGE: 'image' as const,
  SELECTED: 'selected' as const,
  PLAYS: 'plays' as const,
  KEY: 'key' as const,
  TEXT: 'text' as const,
  SUMMARY: 'summary' as const,
  DISABLED: 'disabled' as const,
  FREQUENTLYUPDATED: 'frequentUpdates' as const,
  STARTSMEDIACESSION: 'startsMedia' as const,
  ADJUSTABLE: 'adjustable' as const,
  ALLOWSDIRECTINTERACTION: 'allowsDirectInteraction' as const,
  PAGECURL: 'pageTurn' as const,
};

// ============================================================================
// ACCESSIBILITY HELPERS
// ============================================================================

export const createAccessibilityProps = (options: {
  label?: string;
  hint?: string;
  role?: string;
  state?: Record<string, boolean>;
  value?: { min?: number; max?: number; now?: number; text?: string };
  actions?: Array<{ name: string; label?: string }>;
}) => {
  const props: any = {};

  if (options.label) {
    props.accessibilityLabel = options.label;
  }

  if (options.hint) {
    props.accessibilityHint = options.hint;
  }

  if (options.role) {
    props.accessibilityRole = options.role;
  }

  if (options.state) {
    props.accessibilityState = options.state;
  }

  if (options.value) {
    props.accessibilityValue = options.value;
  }

  if (options.actions) {
    props.accessibilityActions = options.actions;
  }

  return props;
};

export const createFormFieldProps = (options: {
  label: string;
  value?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
}) => {
  const label = options.required ? `${options.label} (required)` : options.label;
  const hint = options.error
    ? `Error: ${options.error}`
    : options.placeholder
      ? `Placeholder: ${options.placeholder}`
      : undefined;

  return createAccessibilityProps({
    label,
    hint,
    role: AccessibilityRoles.TEXTINPUT,
    state: {
      disabled: false,
      ...(options.error && { invalid: true }),
    },
    value: {
      text: options.value || '',
    },
  });
};

export const createButtonProps = (options: {
  label: string;
  hint?: string;
  disabled?: boolean;
  loading?: boolean;
}) => {
  const hint = options.loading ? 'Loading, please wait' : options.hint;

  return createAccessibilityProps({
    label: options.label,
    hint,
    role: AccessibilityRoles.BUTTON,
    state: {
      disabled: options.disabled || options.loading || false,
      busy: options.loading || false,
    },
  });
};

export const createProgressProps = (options: { label: string; progress: number; max?: number }) => {
  const max = options.max || 100;
  const percentage = Math.round((options.progress / max) * 100);

  return createAccessibilityProps({
    label: `${options.label}: ${percentage}% complete`,
    role: AccessibilityRoles.PROGRESSBAR,
    value: {
      min: 0,
      max,
      now: options.progress,
      text: `${percentage}%`,
    },
  });
};

export const createAlertProps = (
  message: string,
  type: 'info' | 'warning' | 'error' | 'success' = 'info'
) => {
  const typeLabels = {
    info: 'Information',
    warning: 'Warning',
    error: 'Error',
    success: 'Success',
  };

  return createAccessibilityProps({
    label: `${typeLabels[type]}: ${message}`,
    role: AccessibilityRoles.ALERT,
  });
};

// ============================================================================
// SCREEN READER UTILITIES
// ============================================================================

export class ScreenReaderUtils {
  static async isScreenReaderEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      console.warn('Failed to check screen reader status:', error);
      return false;
    }
  }

  static async announceForAccessibility(message: string): Promise<void> {
    try {
      AccessibilityInfo.announceForAccessibility(message);
    } catch (error) {
      console.warn('Failed to announce for accessibility:', error);
    }
  }

  static async setAccessibilityFocus(reactTag: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        AccessibilityInfo.setAccessibilityFocus(reactTag);
      }
    } catch (error) {
      console.warn('Failed to set accessibility focus:', error);
    }
  }
}

// ============================================================================
// ACCESSIBILITY TESTING HELPERS
// ============================================================================

export const AccessibilityTestHelpers = {
  // Check if element has proper accessibility props
  hasAccessibilityProps: (element: any): boolean => {
    return !!(
      element.props.accessibilityLabel ||
      element.props.accessibilityRole ||
      element.props.accessibilityHint
    );
  },

  // Check if form field has proper accessibility
  hasFormAccessibility: (element: any): boolean => {
    return !!(element.props.accessibilityLabel && element.props.accessibilityRole === 'textinput');
  },

  // Check if button has proper accessibility
  hasButtonAccessibility: (element: any): boolean => {
    return !!(element.props.accessibilityLabel && element.props.accessibilityRole === 'button');
  },

  // Generate accessibility test ID
  generateTestId: (component: string, section?: string, element?: string): string => {
    const parts = [component];
    if (section) parts.push(section);
    if (element) parts.push(element);
    return parts.join('-').toLowerCase().replace(/\s+/g, '-');
  },
};

// ============================================================================
// PROFILE EDITING ACCESSIBILITY HELPERS
// ============================================================================

export const ProfileEditingA11y = {
  // Personal Info Screen
  personalInfo: {
    screen: () =>
      createAccessibilityProps({
        label: 'Personal Information',
        role: AccessibilityRoles.HEADER,
      }),

    nameField: (value?: string, error?: string) =>
      createFormFieldProps({
        label: 'Full Name',
        value,
        error,
        required: true,
        placeholder: 'Enter your full name',
      }),

    ageField: (value?: string, error?: string) =>
      createFormFieldProps({
        label: 'Age',
        value,
        error,
        required: true,
        placeholder: 'Enter your age',
      }),

    genderField: (value?: string) =>
      createAccessibilityProps({
        label: `Gender: ${value || 'Not selected'}`,
        hint: 'Select your gender',
        role: AccessibilityRoles.BUTTON,
      }),

    saveButton: (loading?: boolean) =>
      createButtonProps({
        label: 'Save Personal Information',
        hint: 'Save your personal information changes',
        loading,
      }),

    cancelButton: () =>
      createButtonProps({
        label: 'Cancel',
        hint: 'Cancel editing and discard changes',
      }),
  },

  // Migration Progress
  migration: {
    progressModal: () =>
      createAccessibilityProps({
        label: 'Data Migration Progress',
        role: AccessibilityRoles.ALERT,
      }),

    progressBar: (progress: number, step: string) =>
      createProgressProps({
        label: `Migration progress: ${step}`,
        progress,
      }),

    stepIcon: (step: string, icon: string) =>
      createAccessibilityProps({
        label: `${step} ${icon}`,
        role: AccessibilityRoles.IMAGE,
      }),

    statusMessage: (message: string, hasError?: boolean) =>
      createAlertProps(message, hasError ? 'error' : 'info'),
  },

  // Edit Overlay
  overlay: {
    modal: () =>
      createAccessibilityProps({
        label: 'Edit Profile',
        role: AccessibilityRoles.ALERT,
      }),

    closeButton: () =>
      createButtonProps({
        label: 'Close',
        hint: 'Close the edit profile modal',
      }),

    dragIndicator: () =>
      createAccessibilityProps({
        label: 'Drag to resize',
        hint: 'Drag up or down to resize the modal',
      }),
  },

  // Conflict Resolution
  conflicts: {
    modal: () =>
      createAccessibilityProps({
        label: 'Resolve Data Conflicts',
        role: AccessibilityRoles.ALERT,
      }),

    conflictItem: (field: string, localValue: string, remoteValue: string) =>
      createAccessibilityProps({
        label: `Conflict for ${field}: Local value is ${localValue}, Cloud value is ${remoteValue}`,
        role: AccessibilityRoles.TEXT,
      }),

    choiceButton: (choice: 'local' | 'remote', selected?: boolean) =>
      createButtonProps({
        label: `Use ${choice === 'local' ? 'device' : 'cloud'} value`,
        hint: `Select the ${choice} value for this field`,
      }),

    resolveAllButton: (resolved: number, total: number) =>
      createButtonProps({
        label: `Resolve All Conflicts (${resolved} of ${total} resolved)`,
        hint: 'Apply all conflict resolutions',
        disabled: resolved !== total,
      }),
  },
};

// ============================================================================
// ACCESSIBILITY ANNOUNCEMENTS
// ============================================================================

export const AccessibilityAnnouncements = {
  editStarted: (section: string) =>
    ScreenReaderUtils.announceForAccessibility(`Started editing ${section}`),

  editSaved: (section: string) =>
    ScreenReaderUtils.announceForAccessibility(`${section} saved successfully`),

  editCancelled: () => ScreenReaderUtils.announceForAccessibility('Edit cancelled'),

  validationError: (errors: string[]) =>
    ScreenReaderUtils.announceForAccessibility(`Validation errors: ${errors.join(', ')}`),

  migrationStarted: () => ScreenReaderUtils.announceForAccessibility('Data migration started'),

  migrationCompleted: () =>
    ScreenReaderUtils.announceForAccessibility('Data migration completed successfully'),

  migrationFailed: () => ScreenReaderUtils.announceForAccessibility('Data migration failed'),

  conflictsDetected: (count: number) =>
    ScreenReaderUtils.announceForAccessibility(`${count} data conflicts detected`),

  conflictsResolved: () => ScreenReaderUtils.announceForAccessibility('All conflicts resolved'),
};

export default {
  AccessibilityRoles,
  AccessibilityStates,
  AccessibilityTraits,
  createAccessibilityProps,
  createFormFieldProps,
  createButtonProps,
  createProgressProps,
  createAlertProps,
  ScreenReaderUtils,
  AccessibilityTestHelpers,
  ProfileEditingA11y,
  AccessibilityAnnouncements,
};
