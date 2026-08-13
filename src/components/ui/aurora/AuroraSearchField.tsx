import React, { forwardRef } from "react";
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { rf, rp, rw } from "../../../utils/responsive";
import { AnimatedPressable } from "./AnimatedPressable";

export interface AuroraSearchFieldProps
  extends Omit<TextInputProps, "onChangeText" | "style" | "value"> {
  value: string;
  onChangeText: (value: string) => void;
  onClear?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  clearAccessibilityHint?: string;
  clearTestID?: string;
}

/**
 * Canonical Aurora search field: one surface, one 48pt height, and a 44pt
 * clear target everywhere search appears. Callers keep ownership of query
 * state and search semantics; this component owns only the shared control UI.
 */
export const AuroraSearchField = forwardRef<TextInput, AuroraSearchFieldProps>(
  (
    {
      value,
      onChangeText,
      onClear,
      containerStyle,
      inputStyle,
      clearAccessibilityHint = "Remove the search query",
      clearTestID,
      placeholderTextColor = colors.text.tertiary,
      autoCapitalize = "none",
      autoCorrect = false,
      returnKeyType = "search",
      accessibilityLabel = "Search",
      ...inputProps
    },
    ref,
  ) => {
    const handleClear = () => {
      if (onClear) {
        onClear();
      } else {
        onChangeText("");
      }
    };

    return (
      <View style={[styles.container, containerStyle]}>
        <Ionicons
          name="search-outline"
          size={rf(18)}
          color={colors.text.tertiary}
          accessible={false}
        />
        <TextInput
          {...inputProps}
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={placeholderTextColor}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          accessibilityLabel={accessibilityLabel}
          style={[styles.input, inputStyle]}
        />
        {value.length > 0 ? (
          <AnimatedPressable
            onPress={handleClear}
            style={styles.clearButton}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            accessibilityHint={clearAccessibilityHint}
            testID={clearTestID}
          >
            <Ionicons
              name="close-circle"
              size={rf(18)}
              color={colors.text.tertiary}
              accessible={false}
            />
          </AnimatedPressable>
        ) : null}
      </View>
    );
  },
);

AuroraSearchField.displayName = "AuroraSearchField";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Math.max(rp(48), 48),
    paddingLeft: rp(spacing.md),
    backgroundColor: colors.glass.backgroundDark,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    gap: rp(spacing.xs),
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
  },
  clearButton: {
    minWidth: Math.max(rw(44), 44),
    minHeight: Math.max(rw(44), 44),
    alignItems: "center",
    justifyContent: "center",
  },
});

export default AuroraSearchField;
