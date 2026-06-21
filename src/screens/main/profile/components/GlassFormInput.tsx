/**
 * GlassFormInput - Glassmorphic Text Input Component
 *
 * Features:
 * - Glassmorphic styling
 * - Icon support
 * - Error state
 * - Animated focus state
 */

import React, { useState } from "react";
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
import { flatColors as colors, spacing, borderRadius } from "../../../../theme/aurora-tokens";
import { rf, rp, rbr, rw } from "../../../../utils/responsive";

interface GlassFormInputProps extends Omit<TextInputProps, "style"> {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  error?: string;
  hint?: string;
  suffix?: string;
}

export const GlassFormInput: React.FC<GlassFormInputProps> = ({
  label,
  icon,
  iconColor = colors.primary,
  error,
  hint,
  suffix,
  value,
  onChangeText,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderOpacity = useSharedValue(0);

  const handleFocus = () => {
    setIsFocused(true);
    borderOpacity.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderOpacity.value = withTiming(0, { duration: 200 });
  };

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.error
      : `rgba(255, 107, 53, ${0.2 + borderOpacity.value * 0.3})`,
  }));

  return (
    <View style={styles.container}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Input Container */}
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
              { backgroundColor: `${iconColor}15` },
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
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          {...props}
        />

        {suffix && <Text style={styles.suffix}>{suffix}</Text>}
      </Animated.View>

      {/* Error or Hint */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle"
            size={rf(12)}
            color={colors.error}
          />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  inputError: {
    borderColor: colors.error,
  },
  iconContainer: {
    width: rw(40),
    height: rw(48),
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.xs,
    borderRadius: borderRadius.md,
  },
  input: {
    flex: 1,
    height: rw(48),
    fontSize: rf(15),
    color: colors.white,
    paddingHorizontal: spacing.md,
  },
  inputNoIcon: {
    paddingLeft: spacing.md,
  },
  suffix: {
    fontSize: rf(14),
    color: colors.textSecondary,
    paddingRight: spacing.md,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    fontSize: rf(11),
    color: colors.error,
  },
  hintText: {
    fontSize: rf(11),
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
});

export default GlassFormInput;
