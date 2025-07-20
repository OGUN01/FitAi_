import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { THEME } from '../../utils/constants';

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
    borderRadius: THEME.borderRadius.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
  },
  
  // Variants
  default: {
    backgroundColor: THEME.colors.backgroundTertiary,
  },
  
  elevated: {
    backgroundColor: THEME.colors.backgroundTertiary,
    ...THEME.shadows.md,
  },
  
  outlined: {
    backgroundColor: THEME.colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  
  // Padding variants
  none: {
    padding: 0,
  },
  
  sm: {
    padding: THEME.spacing.sm,
  },
  
  md: {
    padding: THEME.spacing.md,
  },
  
  lg: {
    padding: THEME.spacing.lg,
  },
});
