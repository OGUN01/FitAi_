import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
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
  const focusAnimation = useSharedValue(0);

  // Animate focus glow
  useEffect(() => {
    focusAnimation.value = withTiming(isFocused ? 1 : 0, {
      duration: 200,
    });
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(focusAnimation.value, [0, 1], [0, 0.3]);
    const shadowRadius = interpolate(focusAnimation.value, [0, 1], [0, 8]);

    return {
      shadowColor: ResponsiveTheme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity,
      shadowRadius,
      elevation: interpolate(focusAnimation.value, [0, 1], [0, 4]),
    };
  });

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Animated.View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
          animatedStyle,
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
          placeholderTextColor={THEME.colors.textSecondary}
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
      </Animated.View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: rh(12),
    width: '100%',
  },

  label: {
    fontSize: rf(13),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(6),
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: rw(12),
    borderWidth: 1.5,
    borderColor: ResponsiveTheme.colors.borderLight,
    minHeight: rh(48),
    width: '100%',
    overflow: 'hidden',
  },

  inputContainerFocused: {
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 2,
    backgroundColor: `${ResponsiveTheme.colors.primary}08`,
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
    fontSize: rf(14),
    color: ResponsiveTheme.colors.text,
    paddingHorizontal: rw(12),
    paddingVertical: rh(12),
    width: '100%',
  },

  inputWithLeftIcon: {
    paddingLeft: rw(8),
  },

  inputWithRightIcon: {
    paddingRight: rw(8),
  },

  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: rh(80),
  },

  leftIconContainer: {
    paddingLeft: rw(12),
    paddingRight: rw(8),
  },

  rightIconContainer: {
    paddingRight: rw(12),
    paddingLeft: rw(8),
  },

  errorText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.error,
    marginTop: rh(4),
    marginLeft: rw(4),
  },
});
