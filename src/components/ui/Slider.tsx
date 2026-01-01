import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, Platform, PanResponder, Animated as RNAnimated } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
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
  const [isDragging, setIsDragging] = useState(false);

  // Reanimated values for native platforms
  const translateX = useSharedValue(0);
  const isSliding = useSharedValue(false);
  const tooltipOpacity = useSharedValue(1);
  const thumbScale = useSharedValue(1);
  const lastHapticValue = useRef(value);

  // Regular Animated values for web platform
  const webThumbPosition = useRef(new RNAnimated.Value(0)).current;
  const webThumbScale = useRef(new RNAnimated.Value(1)).current;

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

  // Helper to calculate value from position (worklet compatible)
  const calculateValueFromPosition = (position: number) => {
    'worklet';
    // Guard against division by zero before layout measurement
    if (sliderWidth === 0) return minimumValue;

    const percentage = Math.max(0, Math.min(1, position / sliderWidth));
    let newValue = minimumValue + percentage * (maximumValue - minimumValue);

    // Apply step
    if (step > 0) {
      newValue = Math.round(newValue / step) * step;
    }

    // Clamp to min/max
    return Math.max(minimumValue, Math.min(maximumValue, newValue));
  };

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number; lastValue: number }
  >({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.lastValue = value;
      isSliding.value = true;
      // Animate thumb scale up and tooltip visible
      thumbScale.value = withSpring(1.15, { damping: 15, stiffness: 300 });
      tooltipOpacity.value = withTiming(1, { duration: 150 });
    },
    onActive: (event, ctx) => {
      const newPosition = Math.max(0, Math.min(sliderWidth, ctx.startX + event.translationX));
      translateX.value = newPosition;

      // Calculate new value but only trigger haptic if it actually changed
      const newValue = calculateValueFromPosition(newPosition);
      if (newValue !== ctx.lastValue) {
        ctx.lastValue = newValue;
        runOnJS(triggerHapticIfNeeded)(newValue);
        // Update parent during drag for live feedback
        runOnJS(onValueChange)(newValue);
      }
    },
    onEnd: () => {
      isSliding.value = false;
      // Animate thumb scale back and tooltip fade
      thumbScale.value = withSpring(1, { damping: 15, stiffness: 300 });
      tooltipOpacity.value = withTiming(0.85, { duration: 200 });
      
      // Snap to nearest step
      const currentValue = calculateValueFromPosition(translateX.value);
      const percentage = (currentValue - minimumValue) / (maximumValue - minimumValue);
      const finalPosition = percentage * sliderWidth;

      translateX.value = withSpring(finalPosition, {
        damping: 20,
        stiffness: 90,
      });

      // Final value update
      runOnJS(onValueChange)(currentValue);
    },
  });

  // Animated styles for thumb
  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: thumbScale.value },
    ],
  }));

  // Animated styles for tooltip - now shows above thumb with fade effect
  const tooltipAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
      ],
      opacity: showTooltip ? tooltipOpacity.value : 0,
    };
  });

  // Animated styles for active track
  const activeTrackStyle = useAnimatedStyle(() => ({
    width: translateX.value,
  }));

  // Animated glow effect for thumb when sliding
  const thumbGlowStyle = useAnimatedStyle(() => {
    const glowOpacity = interpolate(
      thumbScale.value,
      [1, 1.15],
      [0, 0.4]
    );
    return {
      opacity: glowOpacity,
      transform: [
        { translateX: translateX.value },
        { scale: thumbScale.value * 1.5 },
      ],
    };
  });

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.sliderContainer}>
        {/* Compact Tooltip - positioned closer to thumb */}
        {showTooltip && (
          <Animated.View style={[styles.tooltip, tooltipAnimatedStyle]}>
            <View style={styles.tooltipBubble}>
              <Text style={styles.tooltipText}>{formatValue(value)}</Text>
            </View>
          </Animated.View>
        )}

        {/* Track - minimal design without heavy background */}
        <View style={styles.trackContainer} onLayout={handleLayout}>
          {/* Inactive track */}
          <View style={[styles.track, styles.inactiveTrack]} />
          
          {/* Active track with gradient effect */}
          <Animated.View
            style={[
              styles.track,
              styles.activeTrack,
              { backgroundColor: trackColor },
              activeTrackStyle,
            ]}
          />

          {/* Thumb glow effect */}
          <Animated.View
            style={[
              styles.thumbGlow,
              { backgroundColor: thumbColor },
              thumbGlowStyle,
            ]}
          />

          {/* Thumb */}
          <PanGestureHandler 
            onGestureEvent={gestureHandler} 
            enabled={!disabled}
            activeOffsetX={[-10, 10]}
            failOffsetY={[-20, 20]}
          >
            <Animated.View
              style={[
                styles.thumb,
                { backgroundColor: thumbColor },
                thumbAnimatedStyle,
                disabled && styles.thumbDisabled,
              ]}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
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
    marginBottom: ResponsiveTheme.spacing.sm, // Reduced from md
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs, // Reduced from sm
  },

  sliderContainer: {
    position: 'relative',
    paddingTop: 22, // Reduced space for tooltip
  },

  // Minimal track container - compact height
  trackContainer: {
    height: 28, // Reduced from 32
    justifyContent: 'center',
    marginBottom: 4, // Reduced from 6
  },

  // Thinner, elegant track
  track: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    left: 0,
    right: 0,
  },

  inactiveTrack: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },

  activeTrack: {
    backgroundColor: ResponsiveTheme.colors.primary,
    // Subtle inner shadow for depth
    shadowColor: ResponsiveTheme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Refined thumb - smaller and cleaner
  thumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -11,
    // Clean white border
    borderWidth: 3,
    borderColor: ResponsiveTheme.colors.white,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  // Subtle inner indicator
  thumbInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },

  // Glow effect behind thumb when dragging
  thumbGlow: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
  },

  thumbDisabled: {
    opacity: 0.5,
  },

  // Compact tooltip - closer to thumb, minimal design
  tooltip: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    marginLeft: -20,
    zIndex: 10,
  },

  // Smaller, cleaner tooltip bubble
  tooltipBubble: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  tooltipText: {
    color: ResponsiveTheme.colors.primary,
    fontSize: rf(11),
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },

  rangeLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textMuted,
  },
});
