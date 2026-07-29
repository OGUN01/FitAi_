import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutChangeEvent,
  ViewStyle,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { rp, rf } from '../../utils/responsive';
import { flatColors as colors, spacing, flatShadows as shadows } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';

export interface SegmentOption {
  id: string;
  label: string;
  value: string | number;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** Kept for backward compatibility — no longer used. The indicator is now a
   *  white surface with a subtle shadow (spec §6.5). */
  gradient?: string[];
  style?: ViewStyle;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedId,
  onSelect,
  gradient: _gradient,
  style,
}) => {
  const [segmentWidths, setSegmentWidths] = useState<number[]>([]);
  const [, setContainerWidth] = useState(0);
  const translateX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const selectedIndex = options.findIndex((opt) => opt.id === selectedId);

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
    setSegmentWidths((prev) => {
      const newWidths = [...prev];
      newWidths[index] = width;
      return newWidths;
    });
  };

  return (
    <View style={[styles.container, style]} onLayout={handleContainerLayout}>
      {/* Sliding Indicator — white surface + subtle shadow (spec §6.5) */}
      <Animated.View style={[styles.indicator, animatedIndicatorStyle]} />

      {/* Segments */}
      <View style={styles.segmentsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.7}
            onPress={() => onSelect(option.id)}
            onLayout={(event) => handleSegmentLayout(index, event)}
            style={styles.segment}
            accessibilityRole="tab"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: selectedId === option.id }}
          >
            <Text
              style={[styles.segmentText, selectedId === option.id && styles.segmentTextSelected]}
              numberOfLines={2}
              ellipsizeMode="tail"
              adjustsFontSizeToFit
              minimumFontScale={0.7}
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
    backgroundColor: colors.backgroundTertiary,
    borderRadius: rp(14),
    padding: rp(4),
    height: rp(44),
    overflow: 'hidden',
  },

  indicator: {
    position: 'absolute',
    top: rp(4),
    bottom: rp(4),
    left: rp(4),
    borderRadius: rp(10),
    backgroundColor: hexToRgba(colors.white, 0.08),
    borderWidth: 1,
    borderColor: hexToRgba(colors.white, 0.12),
    ...shadows.sm,
    zIndex: 1,
  },

  segmentsContainer: {
    flexDirection: 'row',
    flex: 1,
    zIndex: 2,
  },

  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minWidth: 0,
    minHeight: rp(36),
    // Android includes extra font padding that throws off vertical centering.
    includeFontPadding: false,
  },

  segmentText: {
    fontSize: rf(13),
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    textAlignVertical: 'center',
    flexShrink: 1,
    includeFontPadding: false,
  },

  segmentTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
});
