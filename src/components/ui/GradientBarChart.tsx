import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rp, rh } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

export interface BarData {
  label: string;
  value: number;
  maxValue: number;
  gradient: string[];
  unit?: string;
}

interface GradientBarChartProps {
  data: BarData[];
  height?: number;
  animated?: boolean;
  showValues?: boolean;
  style?: any;
}

export const GradientBarChart: React.FC<GradientBarChartProps> = ({
  data,
  height = rh(200),
  animated = true,
  showValues = true,
  style,
}) => {
  const barHeight = (height - (data.length - 1) * ResponsiveTheme.spacing.md) / data.length;

  return (
    <View style={[styles.container, { height }, style]}>
      {data.map((bar, index) => (
        <BarItem
          key={bar.label}
          data={bar}
          height={barHeight}
          index={index}
          animated={animated}
          showValue={showValues}
        />
      ))}
    </View>
  );
};

interface BarItemProps {
  data: BarData;
  height: number;
  index: number;
  animated: boolean;
  showValue: boolean;
}

const BarItem: React.FC<BarItemProps> = ({ data, height, index, animated, showValue }) => {
  const progress = useSharedValue(0);
  const percentage = (data.value / data.maxValue) * 100;

  useEffect(() => {
    if (animated) {
      progress.value = withDelay(
        index * 150,
        withTiming(percentage, {
          duration: 1000,
          easing: Easing.out(Easing.cubic),
        })
      );
    } else {
      progress.value = percentage;
    }
  }, [data.value, data.maxValue]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));

  return (
    <View style={[styles.barContainer, { height }]}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{data.label}</Text>
        {showValue && (
          <Text style={styles.barValue}>
            {data.value}{data.unit || 'g'}
          </Text>
        )}
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, animatedBarStyle]}>
          <LinearGradient
            colors={data.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.barGradient}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'space-between',
  },

  barContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  barLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
  },

  barValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },

  barTrack: {
    width: '100%',
    height: rh(20),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
  },

  barGradient: {
    flex: 1,
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
});
