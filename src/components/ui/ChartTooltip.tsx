import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { rf, rp } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

interface ChartTooltipProps {
  visible: boolean;
  x: number;
  y: number;
  value: string | number;
  label?: string;
  formatValue?: (value: number | string) => string;
  style?: any;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  visible,
  x,
  y,
  value,
  label,
  formatValue,
  style,
}) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(-10);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
      });
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
    } else {
      opacity.value = withTiming(0, { duration: 150 });
      scale.value = withTiming(0.8, { duration: 150 });
      translateY.value = withTiming(-10, { duration: 150 });
    }
  }, [visible, x, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x },
      { translateY: y + translateY.value },
      { scale: scale.value },
    ],
  }));

  const displayValue = formatValue
    ? formatValue(value)
    : typeof value === 'number'
    ? value.toFixed(1)
    : value;

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <View style={styles.bubble}>
        {label && <Text style={styles.label}>{label}</Text>}
        <Text style={styles.value}>{displayValue}</Text>
      </View>
      <View style={styles.arrow} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 1000,
  },

  bubble: {
    backgroundColor: ResponsiveTheme.colors.surface,
    paddingHorizontal: rp(12),
    paddingVertical: rp(8),
    borderRadius: ResponsiveTheme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rp(2),
    textAlign: 'center',
  },

  value: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    textAlign: 'center',
  },

  arrow: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: rp(6),
    borderRightWidth: rp(6),
    borderTopWidth: rp(6),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: ResponsiveTheme.colors.surface,
  },
});
