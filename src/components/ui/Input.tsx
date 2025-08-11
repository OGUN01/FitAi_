import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/constants';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          selectionColor={THEME.colors.primary}
        />

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    minHeight: rh(48),
  },

  inputContainerFocused: {
    borderColor: ResponsiveTheme.colors.primary,
    ...THEME.shadows.sm,
  },

  inputContainerError: {
    borderColor: ResponsiveTheme.colors.error,
  },

  inputContainerDisabled: {
    opacity: 0.6,
    backgroundColor: ResponsiveTheme.colors.surface,
  },

  input: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.md,
  },

  inputWithLeftIcon: {
    paddingLeft: ResponsiveTheme.spacing.sm,
  },

  inputWithRightIcon: {
    paddingRight: ResponsiveTheme.spacing.sm,
  },

  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: rh(80),
  },

  leftIconContainer: {
    paddingLeft: ResponsiveTheme.spacing.md,
    paddingRight: ResponsiveTheme.spacing.sm,
  },

  rightIconContainer: {
    paddingRight: ResponsiveTheme.spacing.md,
    paddingLeft: ResponsiveTheme.spacing.sm,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
});
