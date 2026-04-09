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
} from "react-native-reanimated";
import { rf, rp, rh, rw, rbr } from "../../utils/responsive";
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
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            multiline && styles.inputMultiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={ResponsiveTheme.colors.textMuted}
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
          selectionColor={ResponsiveTheme.colors.primary}
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
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(6),
    letterSpacing: 0.3,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
    minHeight: rh(48),
    overflow: "hidden",
  },

  inputContainerFocused: {
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 1.5,
    backgroundColor: ResponsiveTheme.colors.primaryTint,
    shadowColor: ResponsiveTheme.colors.primary,
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
    fontSize: rf(14),
    color: ResponsiveTheme.colors.text,
    paddingHorizontal: rp(14),
    paddingVertical: rp(12),
  },

  inputWithLeftIcon: {
    paddingLeft: ResponsiveTheme.spacing.sm,
  },

  inputWithRightIcon: {
    paddingRight: ResponsiveTheme.spacing.sm,
  },

  inputMultiline: {
    textAlignVertical: "top",
    minHeight: rh(80),
  },

  leftIconContainer: {
    paddingLeft: ResponsiveTheme.spacing.md,
    paddingRight: ResponsiveTheme.spacing.sm,
  },

  rightIconContainer: {
    paddingRight: ResponsiveTheme.spacing.md,
    paddingLeft: ResponsiveTheme.spacing.sm,
    minHeight: rh(44),
    minWidth: rw(44),
    justifyContent: "center",
    alignItems: "center",
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.error,
    marginTop: ResponsiveTheme.spacing.xs,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
});
