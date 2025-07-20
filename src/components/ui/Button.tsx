import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { THEME } from '../../utils/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[size],
      ...(fullWidth && styles.fullWidth),
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, ...styles.primary };
      case 'secondary':
        return { ...baseStyle, ...styles.secondary };
      case 'outline':
        return { ...baseStyle, ...styles.outline };
      case 'ghost':
        return { ...baseStyle, ...styles.ghost };
      default:
        return { ...baseStyle, ...styles.primary };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      ...styles.baseText,
      ...styles[`${size}Text` as keyof typeof styles],
    };

    switch (variant) {
      case 'primary':
        return { ...baseTextStyle, ...styles.primaryText };
      case 'secondary':
        return { ...baseTextStyle, ...styles.secondaryText };
      case 'outline':
        return { ...baseTextStyle, ...styles.outlineText };
      case 'ghost':
        return { ...baseTextStyle, ...styles.ghostText };
      default:
        return { ...baseTextStyle, ...styles.primaryText };
    }
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? THEME.colors.primary : THEME.colors.white}
          size="small"
        />
      ) : (
        <Text style={[getTextStyle(), disabled && styles.disabledText, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: THEME.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  // Sizes
  sm: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    minHeight: 48,
  },
  lg: {
    paddingHorizontal: THEME.spacing.xl,
    paddingVertical: THEME.spacing.lg,
    minHeight: 56,
  },
  
  // Variants
  primary: {
    backgroundColor: THEME.colors.primary,
    ...THEME.shadows.md,
  },
  secondary: {
    backgroundColor: THEME.colors.secondary,
    ...THEME.shadows.md,
  },
  outline: {
    backgroundColor: THEME.colors.transparent,
    borderWidth: 2,
    borderColor: THEME.colors.primary,
  },
  ghost: {
    backgroundColor: THEME.colors.transparent,
  },
  
  // Text styles
  baseText: {
    fontWeight: THEME.fontWeight.semibold,
    textAlign: 'center',
  },
  smText: {
    fontSize: THEME.fontSize.sm,
  },
  mdText: {
    fontSize: THEME.fontSize.md,
  },
  lgText: {
    fontSize: THEME.fontSize.lg,
  },
  
  // Text variants
  primaryText: {
    color: THEME.colors.white,
  },
  secondaryText: {
    color: THEME.colors.white,
  },
  outlineText: {
    color: THEME.colors.primary,
  },
  ghostText: {
    color: THEME.colors.primary,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
  
  // Layout
  fullWidth: {
    width: '100%',
  },
});
