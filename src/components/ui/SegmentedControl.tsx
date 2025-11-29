import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { rf, rp, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';

export interface SegmentOption {
  id: string;
  label: string;
  value: string | number;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  gradient?: string[];
  style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedId,
  onSelect,
  gradient = ['#4CAF50', '#45A049'],
  style,
}) => {
  const [segmentWidths, setSegmentWidths] = useState<number[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const selectedIndex = options.findIndex(opt => opt.id === selectedId);

  useEffect(() => {
    if (segmentWidths.length === options.length && selectedIndex >= 0) {
      // Calculate position for the sliding indicator
      const position = segmentWidths.slice(0, selectedIndex).reduce((sum, width) => sum + width, 0);
      const width = segmentWidths[selectedIndex] || 0;

      translateX.value = withSpring(position, {
        damping: 20,
        stiffness: 150,
      });

      indicatorWidth.value = withSpring(width, {
        damping: 20,
        stiffness: 150,
      });
    }
  }, [selectedIndex, segmentWidths]);

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: indicatorWidth.value,
  }));

  const handleContainerLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const handleSegmentLayout = (index: number, event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSegmentWidths(prev => {
      const newWidths = [...prev];
      newWidths[index] = width;
      return newWidths;
    });
  };

  return (
    <View style={[styles.container, style]} onLayout={handleContainerLayout}>
      {/* Sliding Indicator */}
      <Animated.View style={[styles.indicator, animatedIndicatorStyle]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.indicatorGradient}
        />
      </Animated.View>

      {/* Segments */}
      <View style={styles.segmentsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.7}
            onPress={() => onSelect(option.id)}
            onLayout={(event) => handleSegmentLayout(index, event)}
            style={styles.segment}
          >
            <Text
              style={[
                styles.segmentText,
                selectedId === option.id && styles.segmentTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.full,
    padding: rp(4),
    overflow: 'hidden',
  },

  indicator: {
    position: 'absolute',
    top: rp(4),
    bottom: rp(4),
    left: rp(4),
    borderRadius: ResponsiveTheme.borderRadius.full,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1,
  },

  indicatorGradient: {
    flex: 1,
  },

  segmentsContainer: {
    flexDirection: 'row',
    flex: 1,
    zIndex: 2,
  },

  segment: {
    flex: 1,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  segmentText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
  },

  segmentTextSelected: {
    color: ResponsiveTheme.colors.white,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },
});
