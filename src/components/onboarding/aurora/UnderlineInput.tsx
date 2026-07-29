/**
 * UnderlineInput — borderless, underline-only text input (S1 "You" name).
 *
 * Premium "editorial" input style (Notion/Linear): no boxy border, just a
 * 1dp hairline underline that shifts to the accent color when focused. The
 * value sits in body type, the label in caption above. Keeps keyboards rare
 * but, when needed, makes them feel like writing on a clean page — not
 * filling a government form.
 */

import React from "react";
import { StyleSheet, TextInput, TextInputProps, View, Text } from "react-native";
import {
  colors,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";

export interface UnderlineInputProps
  extends Omit<TextInputProps, "style"> {
  label?: string;
  /** Accent color for the focused underline. @default colors.primary.DEFAULT */
  accentColor?: string;
  containerStyle?: View["props"]["style"];
  testID?: string;
}

export const UnderlineInput: React.FC<UnderlineInputProps> = ({
  label,
  accentColor = colors.primary.DEFAULT,
  containerStyle,
  testID,
  ...textInputProps
}) => {
  const [focused, setFocused] = React.useState(false);
  const underline = focused
    ? { backgroundColor: accentColor, height: 1.5 }
    : { backgroundColor: colors.text.tertiary, height: 1 };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...textInputProps}
        testID={testID}
        onFocus={(e) => {
          setFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          textInputProps.onBlur?.(e);
        }}
        placeholderTextColor={colors.text.tertiary}
        style={styles.input}
      />
      <View style={[styles.underline, underline]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.sm,
  },
  label: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.fontSize * typography.variants.caption.lineHeight,
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
  },
  input: {
    fontFamily: typography.variants.cardHeadline.fontFamily, // Manrope_600SemiBold
    fontSize: typography.variants.cardHeadline.fontSize,
    color: colors.text.primary,
    padding: 0,
    paddingBottom: spacing.sm,
  },
  underline: {
    width: "100%",
  },
});
