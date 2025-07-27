import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/responsiveTheme';

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
    borderRadius: ResponsiveTheme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  // Sizes
  sm: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    minHeight: rh(36),
  },
  md: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    minHeight: rh(48),
  },
  lg: {
    paddingHorizontal: ResponsiveTheme.spacing.xl,
    paddingVertical: ResponsiveTheme.spacing.lg,
    minHeight: rh(56),
  },
  
  // Variants
  primary: {
    backgroundColor: ResponsiveTheme.colors.primary,
    ...THEME.shadows.md,
  },
  secondary: {
    backgroundColor: ResponsiveTheme.colors.secondary,
    ...THEME.shadows.md,
  },
  outline: {
    backgroundColor: ResponsiveTheme.colors.transparent,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
  },
  ghost: {
    backgroundColor: ResponsiveTheme.colors.transparent,
  },
  
  // Text styles
  baseText: {
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    textAlign: 'center',
  },
  smText: {
    fontSize: ResponsiveTheme.fontSize.sm,
  },
  mdText: {
    fontSize: ResponsiveTheme.fontSize.md,
  },
  lgText: {
    fontSize: ResponsiveTheme.fontSize.lg,
  },
  
  // Text variants
  primaryText: {
    color: ResponsiveTheme.colors.white,
  },
  secondaryText: {
    color: ResponsiveTheme.colors.white,
  },
  outlineText: {
    color: ResponsiveTheme.colors.primary,
  },
  ghostText: {
    color: ResponsiveTheme.colors.primary,
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
