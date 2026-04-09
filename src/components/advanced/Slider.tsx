import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Platform,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rs, rbr } from '../../utils/responsive';

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
  style?: StyleProp<ViewStyle>;
}

// ─── Web-native HTML range input ────────────────────────────────────────────
// PanResponder does not work reliably on web. We render a styled <input
// type="range"> instead, which works perfectly with mouse/trackpad and touch.
const WebSlider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  label,
  unit = "",
  showValue = true,
  disabled = false,
  trackColor = ResponsiveTheme.colors.surface,
  thumbColor = ResponsiveTheme.colors.primary,
  activeTrackColor = ResponsiveTheme.colors.primary,
  style,
}) => {
  const percentage = ((value - min) / (max - min)) * 100;

  const getDisplayValue = () => `${value}${unit}`;

  // Inline style string for the range input — injected once into the document
  const styleId = "fitai-slider-style";
  if (typeof document !== "undefined" && !document.getElementById(styleId)) {
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
      .fitai-range {
        -webkit-appearance: none;
        appearance: none;
        width: 100%;
        height: 8px;
        border-radius: 4px;
        outline: none;
        cursor: pointer;
        border: none;
        padding: 0;
        margin: 8px 0;
      }
      .fitai-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${thumbColor};
        cursor: pointer;
        border: 2px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        transition: transform 0.1s ease;
      }
      .fitai-range::-webkit-slider-thumb:hover {
        transform: scale(1.15);
      }
      .fitai-range::-webkit-slider-thumb:active {
        transform: scale(1.2);
      }
      .fitai-range::-moz-range-thumb {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${thumbColor};
        cursor: pointer;
        border: 2px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      }
      .fitai-range:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(styleEl);
  }

  return (
    <View style={[styles.container, style]}>
      {/* Label and Value */}
      {(label || showValue) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showValue && (
            <View style={styles.valueContainer}>
              <Text style={styles.value}>{getDisplayValue()}</Text>
              <Text style={styles.percentage}>({percentage.toFixed(0)}%)</Text>
            </View>
          )}
        </View>
      )}

      {/* Native HTML range input — fully draggable on web */}
      {/* @ts-ignore — web-only props are fine here */}
      <input
        type="range"
        className="fitai-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const newValue = parseFloat(e.target.value);
          const steppedValue = Math.round(newValue / step) * step;
          onValueChange(Math.max(min, Math.min(max, steppedValue)));
        }}
        style={{
          // Gradient background shows fill progress
          background: `linear-gradient(to right, ${activeTrackColor} 0%, ${activeTrackColor} ${percentage}%, ${trackColor} ${percentage}%, ${trackColor} 100%)`,
          width: "100%",
          margin: "8px 0",
        } as React.CSSProperties}
      />

      {/* Min/Max Labels */}
      <View style={styles.minMaxContainer}>
        <Text style={styles.minMaxText}>{min}{unit}</Text>
        <Text style={styles.minMaxText}>{max}{unit}</Text>
      </View>
    </View>
  );
};

// ─── Native PanResponder slider (unchanged, works on iOS/Android) ────────────
const NativeSlider: React.FC<SliderProps> = ({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  label,
  unit = "",
  showValue = true,
  disabled = false,
  trackColor = ResponsiveTheme.colors.surface,
  thumbColor = ResponsiveTheme.colors.primary,
  activeTrackColor = ResponsiveTheme.colors.primary,
  style,
}) => {
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const thumbPosition = useRef(new Animated.Value(0)).current;
  const thumbScale = useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (sliderWidth > 24) {
      const percentage = (value - min) / (max - min);
      const position = percentage * (sliderWidth - 24);
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
      Animated.spring(thumbScale, { toValue: 1.2, useNativeDriver: false }).start();
    },

    onPanResponderMove: (event, gestureState) => {
      if (sliderWidth <= 24) return;
      const { dx } = gestureState;
      const currentPosition = ((value - min) / (max - min)) * (sliderWidth - 24);
      const newPosition = Math.max(0, Math.min(sliderWidth - 24, currentPosition + dx));
      thumbPosition.setValue(newPosition);
      const percentage = newPosition / (sliderWidth - 24);
      const newValue = min + percentage * (max - min);
      const steppedValue = Math.round(newValue / step) * step;
      onValueChange(Math.max(min, Math.min(max, steppedValue)));
    },

    onPanResponderRelease: () => {
      setIsDragging(false);
      Animated.spring(thumbScale, { toValue: 1, useNativeDriver: false }).start();
    },
  });

  const getDisplayValue = () => `${value}${unit}`;
  const getValuePercentage = () => ((value - min) / (max - min)) * 100;

  return (
    <View style={[styles.container, style]}>
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

      <View
        style={[styles.track, { backgroundColor: trackColor }]}
        onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
      >
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

      <View style={styles.minMaxContainer}>
        <Text style={styles.minMaxText}>{min}{unit}</Text>
        <Text style={styles.minMaxText}>{max}{unit}</Text>
      </View>

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
                      backgroundColor: stepValue <= value ? activeTrackColor : trackColor,
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

// ─── Exported Slider — auto-selects web vs native renderer ──────────────────
export const Slider: React.FC<SliderProps> = (props) => {
  if (Platform.OS === 'web') {
    return <WebSlider {...props} />;
  }
  return <NativeSlider {...props} />;
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: ResponsiveTheme.spacing.sm,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  label: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.medium as "500",
    color: ResponsiveTheme.colors.text,
  },

  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },

  value: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.primary,
  },

  percentage: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  track: {
    height: 8,
    borderRadius: rbr(4),
    position: "relative",
    marginVertical: ResponsiveTheme.spacing.sm,
  },

  activeTrack: {
    height: 8,
    borderRadius: rbr(4),
    position: "absolute",
    top: 0,
    left: 0,
  },

  thumb: {
    width: rs(24),
    height: rs(24),
    borderRadius: rbr(12),
    position: "absolute",
    top: -8,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    ...ResponsiveTheme.shadows.sm,
  },

  thumbDisabled: {
    opacity: 0.5,
  },

  thumbInner: {
    width: rs(12),
    height: rs(12),
    borderRadius: rbr(6),
    backgroundColor: ResponsiveTheme.colors.white,
  },

  minMaxContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: ResponsiveTheme.spacing.xs,
  },

  minMaxText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  stepsContainer: {
    position: "relative",
    height: 4,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  stepIndicator: {
    position: "absolute",
    width: rs(2),
    height: 4,
    borderRadius: rbr(1),
    top: 0,
    transform: [{ translateX: -1 }],
  },
});
