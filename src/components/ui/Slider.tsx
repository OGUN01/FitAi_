import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { hapticSelection } from '../../utils/haptics';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  label?: string;
  showTooltip?: boolean;
  formatValue?: (value: number) => string;
  style?: any;
  trackColor?: string;
  thumbColor?: string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  label,
  showTooltip = true,
  formatValue = (val) => val.toString(),
  style,
  trackColor = ResponsiveTheme.colors.primary,
  thumbColor = ResponsiveTheme.colors.primary,
  disabled = false,
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const translateX = useSharedValue(0);
  const isSliding = useSharedValue(false);
  const lastHapticValue = useRef(value);

  // Calculate initial position based on value
  const getPositionFromValue = useCallback(
    (val: number) => {
      if (sliderWidth === 0) return 0;
      const percentage = (val - minimumValue) / (maximumValue - minimumValue);
      return percentage * sliderWidth;
    },
    [sliderWidth, minimumValue, maximumValue]
  );

  // Calculate value from position
  const getValueFromPosition = useCallback(
    (position: number) => {
      const percentage = Math.max(0, Math.min(1, position / sliderWidth));
      let newValue = minimumValue + percentage * (maximumValue - minimumValue);

      // Apply step
      if (step > 0) {
        newValue = Math.round(newValue / step) * step;
      }

      // Clamp to min/max
      return Math.max(minimumValue, Math.min(maximumValue, newValue));
    },
    [sliderWidth, minimumValue, maximumValue, step]
  );

  // Trigger haptic feedback when value changes
  const triggerHapticIfNeeded = useCallback((newValue: number) => {
    if (newValue !== lastHapticValue.current) {
      lastHapticValue.current = newValue;
      hapticSelection();
    }
  }, []);

  // Update translateX when value changes externally
  React.useEffect(() => {
    if (!isSliding.value) {
      translateX.value = withSpring(getPositionFromValue(value), {
        damping: 20,
        stiffness: 90,
      });
    }
  }, [value, sliderWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setSliderWidth(width);
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number }
  >({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      isSliding.value = true;
    },
    onActive: (event, ctx) => {
      const newPosition = Math.max(0, Math.min(sliderWidth, ctx.startX + event.translationX));
      translateX.value = newPosition;

      // Calculate and update value
      const newValue = getValueFromPosition(newPosition);
      runOnJS(onValueChange)(newValue);
      runOnJS(triggerHapticIfNeeded)(newValue);
    },
    onEnd: () => {
      isSliding.value = false;
      // Snap to nearest step
      const currentValue = getValueFromPosition(translateX.value);
      translateX.value = withSpring(getPositionFromValue(currentValue), {
        damping: 20,
        stiffness: 90,
      });
    },
  });

  // Animated styles for thumb
  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Animated styles for tooltip
  const tooltipAnimatedStyle = useAnimatedStyle(() => {
    const scale = isSliding.value ? withSpring(1.1) : withSpring(1);
    const opacity = showTooltip ? (isSliding.value ? 1 : 0.8) : 0;

    return {
      transform: [
        { translateX: translateX.value },
        { scale },
      ],
      opacity,
    };
  });

  // Animated styles for active track
  const activeTrackStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.sliderContainer}>
        {/* Tooltip */}
        {showTooltip && (
          <Animated.View style={[styles.tooltip, tooltipAnimatedStyle]}>
            <View style={styles.tooltipBubble}>
              <Text style={styles.tooltipText}>{formatValue(value)}</Text>
            </View>
            <View style={styles.tooltipArrow} />
          </Animated.View>
        )}

        {/* Track */}
        <View style={styles.trackContainer} onLayout={handleLayout}>
          <View style={[styles.track, styles.inactiveTrack]} />
          <Animated.View
            style={[
              styles.track,
              styles.activeTrack,
              { backgroundColor: trackColor },
              activeTrackStyle,
            ]}
          />

          {/* Thumb */}
          <PanGestureHandler onGestureEvent={gestureHandler} enabled={!disabled}>
            <Animated.View
              style={[
                styles.thumb,
                { backgroundColor: thumbColor },
                thumbAnimatedStyle,
                disabled && styles.thumbDisabled,
              ]}
            >
              <View style={styles.thumbInner} />
            </Animated.View>
          </PanGestureHandler>
        </View>

        {/* Min/Max labels */}
        <View style={styles.labelsContainer}>
          <Text style={styles.rangeLabel}>{formatValue(minimumValue)}</Text>
          <Text style={styles.rangeLabel}>{formatValue(maximumValue)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  sliderContainer: {
    position: 'relative',
  },

  trackContainer: {
    height: rh(40),
    justifyContent: 'center',
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  track: {
    position: 'absolute',
    height: rh(4),
    borderRadius: rh(2),
  },

  inactiveTrack: {
    width: '100%',
    backgroundColor: ResponsiveTheme.colors.border,
  },

  activeTrack: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  thumb: {
    position: 'absolute',
    width: rw(24),
    height: rh(24),
    borderRadius: rh(12),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -rw(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  thumbInner: {
    width: rw(12),
    height: rh(12),
    borderRadius: rh(6),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  thumbDisabled: {
    opacity: 0.5,
  },

  tooltip: {
    position: 'absolute',
    top: -rh(45),
    alignItems: 'center',
    marginLeft: -rw(25),
  },

  tooltipBubble: {
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(12),
    paddingVertical: rp(6),
    borderRadius: ResponsiveTheme.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  tooltipText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  tooltipArrow: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: rw(6),
    borderRightWidth: rw(6),
    borderTopWidth: rh(6),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: ResponsiveTheme.colors.primary,
  },

  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  rangeLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },
});
