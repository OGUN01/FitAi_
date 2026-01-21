import React, { useState, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { rf, rp, rh, rw, rs } from "../../utils/responsive";
import { THEME } from "../../utils/constants";
import { ResponsiveTheme } from "../../utils/constants";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  disabled?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
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
  keyboardType = "default",
  autoCapitalize = "sentences",
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

  // Note: Shadow animations removed from useAnimatedStyle to fix React Native warning
  // Shadow glow effect is now applied via inputContainerFocused style
  const animatedStyle = useAnimatedStyle(() => {
    return {};
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
            leftIcon && (styles.inputWithLeftIcon as any),
            rightIcon && (styles.inputWithRightIcon as any),
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.35)"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
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
    marginBottom: ResponsiveTheme.spacing.md,
  },

  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    minHeight: 48,
    overflow: "hidden",
  },

  inputContainerFocused: {
    borderColor: "#6366F1",
    borderWidth: 1.5,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 14,
    color: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  inputWithLeftIcon: {
    paddingLeft: ResponsiveTheme.spacing.sm,
  },

  inputWithRightIcon: {
    paddingRight: ResponsiveTheme.spacing.sm,
  },

  inputMultiline: {
    textAlignVertical: "top",
    minHeight: 80,
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
