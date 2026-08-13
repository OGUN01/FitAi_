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
  interpolateColor,
} from "react-native-reanimated";
import { rf, rp, rh, rw, rbr } from "../../utils/responsive";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { useReducedMotion } from "../../utils/accessibility/hooks";

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
  /** TestID for automation + accessibility addressing (Maestro/uiautomator). */
  testID?: string;
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
  testID,
}) => {
  const reducedMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);
  const focusAnimation = useSharedValue(0);

  // Animate focus glow
  useEffect(() => {
    focusAnimation.value = reducedMotion
      ? (isFocused ? 1 : 0)
      : withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [focusAnimation, isFocused, reducedMotion]);

  // Real animated border/glow transition (border colour, width, background
  // tint and shadow all ease in together instead of snapping instantly),
  // matching the Reanimated-driven feel of Button/GlassButton/EmptyState.
  const animatedFocusStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      focusAnimation.value,
      [0, 1],
      [colors.glassBorder, colors.primary],
    ),
    borderWidth: 1 + focusAnimation.value * 0.5,
    backgroundColor: interpolateColor(
      focusAnimation.value,
      [0, 1],
      [colors.glassSurface, colors.primaryTint],
    ),
    shadowOpacity: focusAnimation.value * 0.3,
    elevation: focusAnimation.value * 4,
  }));

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Animated.View
        style={[
          styles.inputContainer,
          // Error colour takes precedence while there is an error; once the
          // error is cleared the border returns to the focus/default colour
          // immediately instead of sticking on the error colour until the
          // next focus event (the previous animated border style only
          // re-evaluated on focus/blur).
          error ? styles.inputContainerError : animatedFocusStyle,
          disabled && styles.inputContainerDisabled,
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
          testID={testID}
          accessibilityLabel={label || placeholder}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
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
          selectionColor={colors.primary}
        />

        {rightIcon && (
          <TouchableOpacity
            style={[
              styles.rightIconContainer,
              !onRightIconPress && styles.rightIconContainerNonInteractive,
            ]}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            accessibilityRole={onRightIconPress ? "button" : undefined}
            accessibilityLabel={
              secureTextEntry ? "Show password" : "Hide password"
            }
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>

      {error && (
        <Text
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },

  label: {
    fontSize: rf(12),
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: rp(6),
    letterSpacing: 0.3,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: colors.glassSurface,
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: rh(48),
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0,
  },

  inputContainerError: {
    borderColor: colors.error,
  },

  inputContainerDisabled: {
    opacity: 0.6,
    backgroundColor: colors.surface,
  },

  input: {
    flex: 1,
    fontSize: rf(14),
    color: colors.text,
    paddingHorizontal: rp(14),
    paddingVertical: rp(12),
  },

  inputWithLeftIcon: {
    paddingLeft: spacing.sm,
  },

  inputWithRightIcon: {
    paddingRight: spacing.sm,
  },

  inputMultiline: {
    textAlignVertical: "top",
    minHeight: rh(80),
  },

  leftIconContainer: {
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
  },

  rightIconContainer: {
    paddingRight: spacing.md,
    paddingLeft: spacing.sm,
    minHeight: rh(44),
    minWidth: rw(44),
    justifyContent: "center",
    alignItems: "center",
  },

  // When no onPress handler is provided the right icon is purely decorative;
  // shrink it so it stops reserving a 44px tap target that isn't interactive.
  rightIconContainerNonInteractive: {
    minWidth: 0,
    minHeight: 0,
  },

  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});
