import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from "react-native";
import { THEME } from "../../utils/constants";

interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  unit?: string;
  showValue?: boolean;
  disabled?: boolean;
  trackColor?: string;
  thumbColor?: string;
  activeTrackColor?: string;
  style?: any;
}

export const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  label,
  unit = "",
  showValue = true,
  disabled = false,
  trackColor = THEME.colors.surface,
  thumbColor = THEME.colors.primary,
  activeTrackColor = THEME.colors.primary,
  style,
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const thumbPosition = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  // Calculate thumb position based on value
  React.useEffect(() => {
    if (sliderWidth > 24) {
      // Ensure slider is wide enough
      const percentage = (value - min) / (max - min);
      const position = percentage * (sliderWidth - 24); // 24 is thumb width

      Animated.timing(thumbPosition, {
        toValue: position,
        duration: isDragging ? 0 : 200,
        useNativeDriver: false,
      }).start();
    }
  }, [value, min, max, sliderWidth, isDragging]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,

    onPanResponderGrant: () => {
      setIsDragging(true);
      Animated.spring(thumbScale, {
        toValue: 1.2,
        useNativeDriver: false,
      }).start();
    },

    onPanResponderMove: (event, gestureState) => {
      if (sliderWidth <= 24) return; // Prevent calculation with invalid slider width

      const { dx } = gestureState;
      const currentPosition =
        ((value - min) / (max - min)) * (sliderWidth - 24);
      const newPosition = Math.max(
        0,
        Math.min(sliderWidth - 24, currentPosition + dx),
      );

      thumbPosition.setValue(newPosition);

      // Calculate new value
      const percentage = newPosition / (sliderWidth - 24);
      const newValue = min + percentage * (max - min);
      const steppedValue = Math.round(newValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      onValueChange(clampedValue);
    },

    onPanResponderRelease: () => {
      setIsDragging(false);
      Animated.spring(thumbScale, {
        toValue: 1,
        useNativeDriver: false,
      }).start();
    },
  });

  const getDisplayValue = () => {
    return `${value}${unit}`;
  };

  const getValuePercentage = () => {
    return ((value - min) / (max - min)) * 100;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Label and Value */}
      {(label || showValue) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showValue && (
            <View style={styles.valueContainer}>
              <Text style={styles.value}>{getDisplayValue()}</Text>
              <Text style={styles.percentage}>
                ({getValuePercentage().toFixed(0)}%)
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Slider Track */}
      <View
        style={[styles.track, { backgroundColor: trackColor }]}
        onLayout={(event) => {
          setSliderWidth(event.nativeEvent.layout.width);
        }}
      >
        {/* Active Track */}
        <Animated.View
          style={[
            styles.activeTrack,
            {
              backgroundColor: activeTrackColor,
              width:
                sliderWidth > 24
                  ? thumbPosition.interpolate({
                      inputRange: [0, sliderWidth - 24],
                      outputRange: [12, sliderWidth - 12],
                      extrapolate: "clamp",
                    })
                  : 12,
            },
          ]}
        />

        {/* Thumb */}
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: thumbColor,
              transform: [{ translateX: thumbPosition }, { scale: thumbScale }],
            },
            disabled && styles.thumbDisabled,
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.thumbInner} />
        </Animated.View>
      </View>

      {/* Min/Max Labels */}
      <View style={styles.minMaxContainer}>
        <Text style={styles.minMaxText}>
          {min}
          {unit}
        </Text>
        <Text style={styles.minMaxText}>
          {max}
          {unit}
        </Text>
      </View>

      {/* Step Indicators */}
      {step > 1 && (
        <View style={styles.stepsContainer}>
          {Array.from(
            { length: Math.floor((max - min) / step) + 1 },
            (_, index) => {
              const stepValue = min + index * step;
              const stepPercentage = ((stepValue - min) / (max - min)) * 100;

              return (
                <View
                  key={index}
                  style={[
                    styles.stepIndicator,
                    {
                      left: `${stepPercentage}%`,
                      backgroundColor:
                        stepValue <= value ? activeTrackColor : trackColor,
                    },
                  ]}
                />
              );
            },
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: THEME.spacing.sm,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.md,
  },

  label: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium as "500",
    color: THEME.colors.text,
  },

  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: THEME.spacing.xs,
  },

  value: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.primary,
  },

  percentage: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },

  track: {
    height: 8,
    borderRadius: 4,
    position: "relative",
    marginVertical: THEME.spacing.sm,
  },

  activeTrack: {
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: 0,
    left: 0,
  },

  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: "absolute",
    top: -8,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    ...THEME.shadows.sm,
  },

  thumbDisabled: {
    opacity: 0.5,
  },

  thumbInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.white,
  },

  minMaxContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: THEME.spacing.xs,
  },

  minMaxText: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },

  stepsContainer: {
    position: "relative",
    height: 4,
    marginTop: THEME.spacing.xs,
  },

  stepIndicator: {
    position: "absolute",
    width: 2,
    height: 4,
    borderRadius: 1,
    top: 0,
    transform: [{ translateX: -1 }],
  },
});
