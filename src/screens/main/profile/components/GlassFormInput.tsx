/**
 * GlassFormInput - Unified FormField pattern: label above, 14px radius, focused accent border
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
} from "../../../../theme/aurora-tokens";
import { rf, rw } from "../../../../utils/responsive";

const { variants } = typography;

interface GlassFormInputProps extends Omit<TextInputProps, "style"> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  error?: string;
  hint?: string;
  suffix?: string;
}

export const GlassFormInput: React.FC<GlassFormInputProps> = React.memo(({
  label,
  icon,
  iconColor = colors.primary.DEFAULT,
  error,
  hint,
  suffix,
  value,
  onChangeText,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderOpacity = useSharedValue(0);

  const handleFocus = useCallback(
    (e: Parameters<NonNullable<TextInputProps["onFocus"]>>[0]) => {
      setIsFocused(true);
      borderOpacity.value = withTiming(1, { duration: 200 });
      onFocus?.(e);
    },
    [onFocus, borderOpacity],
  );

  const handleBlur = useCallback(
    (e: Parameters<NonNullable<TextInputProps["onBlur"]>>[0]) => {
      setIsFocused(false);
      borderOpacity.value = withTiming(0, { duration: 200 });
      onBlur?.(e);
    },
    [onBlur, borderOpacity],
  );

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.error.DEFAULT
      : isFocused
        ? colors.primary.DEFAULT
        : border.DEFAULT,
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Animated.View
        style={[
          styles.inputContainer,
          animatedBorderStyle,
          error && styles.inputError,
        ]}
      >
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${iconColor}14` },
            ]}
          >
            <Ionicons name={icon} size={rf(16)} color={iconColor} />
          </View>
        )}

        <TextInput
          style={[styles.input, !icon && styles.inputNoIcon]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={colors.text.tertiary}
          selectionColor={colors.primary.DEFAULT}
          {...props}
          accessibilityLabel={props.accessibilityLabel ?? label}
          accessibilityHint={
            props.accessibilityHint ?? (error ? `Error: ${error}` : hint)
          }
          accessibilityState={{
            ...props.accessibilityState,
            disabled: props.editable === false,
          }}
        />

        {suffix && (
          <Text style={styles.suffix} numberOfLines={1}>
            {suffix}
          </Text>
        )}
      </Animated.View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={rf(12)}
            color={colors.error.DEFAULT}
          />
          <Text style={styles.errorText} accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...variants.caption,
    fontSize: rf(13),
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: surface[1],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    overflow: "hidden",
    minHeight: Math.max(rw(48), 44),
  },
  inputError: {
    borderColor: colors.error.DEFAULT,
  },
  iconContainer: {
    width: rw(32),
    height: rw(32),
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.sm,
    borderRadius: rw(8),
  },
  input: {
    flex: 1,
    minHeight: Math.max(rw(48), 44),
    ...variants.body,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
  },
  inputNoIcon: {
    paddingLeft: spacing.md,
  },
  suffix: {
    ...variants.body,
    fontSize: rf(14),
    color: colors.text.secondary,
    paddingRight: spacing.md,
    flexShrink: 0,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    ...variants.caption,
    fontSize: rf(11),
    color: colors.error.DEFAULT,
  },
  hintText: {
    ...variants.caption,
    fontSize: rf(11),
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});

export default GlassFormInput;
