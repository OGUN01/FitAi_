import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/constants';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'md',
}) => {
  const getCardStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.base,
      ...styles[padding],
    };

    switch (variant) {
      case 'elevated':
        return { ...baseStyle, ...styles.elevated };
      case 'outlined':
        return { ...baseStyle, ...styles.outlined };
      default:
        return { ...baseStyle, ...styles.default };
    }
  };

  if (onPress) {
    return (
      <TouchableOpacity
        style={[getCardStyle(), style]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[getCardStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },
  
  // Variants
  default: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },
  
  elevated: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    ...THEME.shadows.md,
  },
  
  outlined: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  
  // Padding variants
  none: {
    padding: rp(0),
  },
  
  sm: {
    padding: ResponsiveTheme.spacing.sm,
  },
  
  md: {
    padding: ResponsiveTheme.spacing.md,
  },
  
  lg: {
    padding: ResponsiveTheme.spacing.lg,
  },
});
