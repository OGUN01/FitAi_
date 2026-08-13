/**
 * SlidingSegmentedControl
 *
 * Single shared implementation of the "connected track, single-select,
 * sliding indicator" pattern. Previously this ~60 lines of translateX /
 * withSpring / onLayout logic was hand-copied in both
 * `src/components/ui/SegmentedControl.tsx` and
 * `src/screens/main/analytics/PeriodSelector.tsx`, drifting out of sync
 * (different spring configs, different accessibility roles, different press
 * interactions). Both now delegate here so the sliding-indicator motion is
 * defined exactly once.
 *
 * Two visual variants cover the two visual languages already established in
 * the app — deliberately kept separate rather than forced into one palette,
 * since they serve different surfaces (dark flat editor sheet vs. light
 * Aurora glass header):
 *  - 'aurora': surface/border tokens used by PeriodSelector (Analytics header).
 *  - 'flat':   flatColors tokens used by SegmentedControl (ExerciseEditorSheet).
 *
 * Any future exclusive single-select toggle (e.g. a Workout plan-source
 * toggle) should render this component directly instead of hand-rolling a
 * new track.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { AnimatedPressable } from './AnimatedPressable';
import {
  surface,
  border as borderTokens,
  borderRadius,
  colors,
  typography,
  flatColors,
  spacing,
  flatShadows,
} from '../../../theme/aurora-tokens';
import { rp } from '../../../utils/responsive';
import { hexToRgba } from '../../../utils/colors';
import { haptics } from '../../../utils/haptics';
import { useReducedMotion } from '../../../utils/accessibility/hooks';

export interface SlidingSegmentedOption {
  id: string;
  label: string;
}

export interface SlidingSegmentedControlProps {
  options: SlidingSegmentedOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  /** @default 'aurora' */
  variant?: 'aurora' | 'flat';
  style?: ViewStyle;
  /** Prefix for per-segment testIDs, e.g. `${testIDPrefix}-week`. */
  testIDPrefix?: string;
}

const TRACK_PADDING = rp(4);

export const SlidingSegmentedControl: React.FC<SlidingSegmentedControlProps> = ({
  options,
  selectedId,
  onSelect,
  variant = 'aurora',
  style,
  testIDPrefix,
}) => {
  const reduceMotion = useReducedMotion();
  const [segmentWidths, setSegmentWidths] = useState<number[]>([]);
  const translateX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const selectedIndex = options.findIndex((opt) => opt.id === selectedId);
  const v = variant === 'flat' ? flatStyles : auroraStyles;

  useEffect(() => {
    if (segmentWidths.length === options.length && selectedIndex >= 0) {
      const position = segmentWidths.slice(0, selectedIndex).reduce((sum, w) => sum + w, 0);
      const width = segmentWidths[selectedIndex] || 0;

      translateX.value = reduceMotion
        ? position
        : withSpring(position, { damping: 20, stiffness: 150 });
      indicatorWidth.value = reduceMotion
        ? width
        : withSpring(width, { damping: 20, stiffness: 150 });
    }
  }, [indicatorWidth, options.length, reduceMotion, segmentWidths, selectedIndex, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: indicatorWidth.value,
  }));

  const handleSegmentLayout = (index: number, event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSegmentWidths((prev) => {
      const next = [...prev];
      next[index] = width;
      return next;
    });
  };

  return (
    <View style={[v.container, style]}>
      <Animated.View style={[v.indicator, indicatorStyle]} />

      <View style={v.segmentsRow}>
        {options.map((option, index) => (
          <View key={option.id} style={v.segmentWrapper}>
            <AnimatedPressable
              style={v.segment}
              onPress={() => {
                haptics.selection();
                onSelect(option.id);
              }}
              onLayout={(event) => handleSegmentLayout(index, event)}
              scaleValue={0.97}
              hapticFeedback={false}
              accessibilityRole="tab"
              accessibilityState={{ selected: option.id === selectedId }}
              accessibilityLabel={option.label}
              testID={testIDPrefix ? `${testIDPrefix}-${option.id}` : undefined}
            >
              <Text
                style={[v.text, option.id === selectedId && v.textActive]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {option.label}
              </Text>
            </AnimatedPressable>
          </View>
        ))}
      </View>
    </View>
  );
};

const auroraStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: surface[1],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    padding: TRACK_PADDING,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    borderRadius: borderRadius.md,
    backgroundColor: surface[2],
    borderWidth: 1,
    borderColor: borderTokens.DEFAULT,
  },
  segmentsRow: {
    flexDirection: 'row',
    flex: 1,
  },
  segmentWrapper: {
    flex: 1,
    zIndex: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: rp(10),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: {
    fontFamily: typography.variants.caption2.fontFamily,
    fontSize: typography.variants.caption2.fontSize,
    color: colors.text.secondary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  textActive: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    color: colors.text.primary,
  },
});

const flatStyles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: flatColors.backgroundTertiary,
    borderRadius: borderRadius.xl, // 16 — was an off-grid rp(14)
    padding: rp(4),
    minHeight: rp(44),
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: rp(4),
    bottom: rp(4),
    left: rp(4),
    borderRadius: borderRadius.lg, // 12 — was an off-grid rp(10)
    backgroundColor: hexToRgba(flatColors.white, 0.08),
    borderWidth: 1,
    borderColor: hexToRgba(flatColors.white, 0.12),
    ...flatShadows.sm,
  },
  segmentsRow: {
    flexDirection: 'row',
    flex: 1,
    zIndex: 2,
  },
  segmentWrapper: {
    flex: 1,
    zIndex: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
    minHeight: 44,
    includeFontPadding: false,
  } as ViewStyle,
  text: {
    fontFamily: typography.variants.caption2.fontFamily,
    fontSize: typography.variants.caption2.fontSize, // 13 — was a raw rf(13) literal
    fontWeight: '500',
    color: flatColors.textSecondary,
    textAlign: 'center',
    textAlignVertical: 'center',
    flexShrink: 1,
    includeFontPadding: false,
  },
  textActive: {
    color: flatColors.text,
    fontWeight: '600',
  },
});

export default SlidingSegmentedControl;
