/**
 * DietTextField - shared text-entry surface for Diet's logging modals.
 *
 * Mirrors the animated-focus-border + icon-squircle pattern already
 * established by Profile's GlassFormInput (borderRadius.lg = 12px radius,
 * border.DEFAULT idle → primary on focus, error red on error) so meal/water/
 * barcode entry shares the same interaction language as the rest of the app
 * instead of each modal inventing its own static-border input.
 */

import React, { forwardRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, surface, border, spacing, borderRadius } from '../../theme/aurora-tokens';
import { rf, rw } from '../../utils/responsive';

export interface DietTextFieldProps extends Omit<TextInputProps, 'style'> {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** Shows the error (red) border regardless of focus state. */
  error?: boolean;
  /** Trailing content rendered inside the field (e.g. a unit label or clear button). */
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
  inputStyle?: TextInputProps['style'];
}

export const DietTextField = forwardRef<TextInput, DietTextFieldProps>(
  (
    {
      icon,
      iconColor = colors.primary.DEFAULT,
      error = false,
      rightElement,
      containerStyle,
      inputStyle,
      onFocus,
      onBlur,
      placeholderTextColor = colors.text.tertiary,
      ...props
    },
    ref
  ) => {
    const focusProgress = useSharedValue(0);

    const handleFocus: NonNullable<TextInputProps['onFocus']> = (e) => {
      focusProgress.value = withTiming(1, { duration: 200 });
      onFocus?.(e);
    };

    const handleBlur: NonNullable<TextInputProps['onBlur']> = (e) => {
      focusProgress.value = withTiming(0, { duration: 200 });
      onBlur?.(e);
    };

    const animatedBorderStyle = useAnimatedStyle(() => ({
      borderColor: error
        ? colors.error.DEFAULT
        : focusProgress.value > 0.5
          ? colors.primary.DEFAULT
          : border.DEFAULT,
    }));

    return (
      <Animated.View style={[styles.container, animatedBorderStyle, containerStyle]}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: `${iconColor}14` }]}>
            <Ionicons name={icon} size={rf(16)} color={iconColor} />
          </View>
        )}
        <TextInput
          ref={ref}
          style={[styles.input, !icon && styles.inputNoIcon, inputStyle]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor={placeholderTextColor}
          selectionColor={colors.primary.DEFAULT}
          {...props}
        />
        {rightElement}
      </Animated.View>
    );
  }
);

DietTextField.displayName = 'DietTextField';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: border.DEFAULT,
    minHeight: Math.max(rw(48), 44),
    paddingRight: spacing.sm,
  },
  iconContainer: {
    width: rw(32),
    height: rw(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    borderRadius: rw(8),
  },
  input: {
    flex: 1,
    minHeight: Math.max(rw(48), 44),
    fontSize: rf(15),
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
  },
  inputNoIcon: {
    paddingLeft: spacing.md,
  },
});

export default DietTextField;
