import React, { useEffect } from "react";
import { View, Text, TextInput, StyleSheet, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { rp, rw } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";

interface MetricInputProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minValue: number;
  maxValue: number;
  unit: string;
  step?: number;
  showScale?: boolean;
  gradient?: string[];
  style?: ViewStyle;
}

export const MetricInput: React.FC<MetricInputProps> = ({
  label,
  value,
  onValueChange,
  minValue,
  maxValue,
  unit,
  step = 1,
  showScale = true,
  gradient = [colors.success, colors.success],
  style,
}) => {
  const progress = useSharedValue(0);
  const [inputValue, setInputValue] = React.useState(value.toString());

  // Calculate percentage for visual indicator
  const percentage = ((value - minValue) / (maxValue - minValue)) * 100;

  useEffect(() => {
    progress.value = withSpring(percentage, {
      damping: 20,
      stiffness: 90,
    });
  }, [value, minValue, maxValue]);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 100],
      [0, rw(100) - rw(20) - rp(32)], // Total width minus indicator width minus padding
      Extrapolate.CLAMP,
    );

    return {
      transform: [{ translateX }],
    };
  });

  const handleInputChange = (text: string) => {
    setInputValue(text);
    const numValue = parseFloat(text);

    if (!isNaN(numValue)) {
      const clampedValue = Math.max(minValue, Math.min(maxValue, numValue));
      const steppedValue = Math.round(clampedValue / step) * step;
      onValueChange(steppedValue);
    }
  };

  const handleInputBlur = () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue)) {
      setInputValue(value.toString());
    } else {
      const clampedValue = Math.max(minValue, Math.min(maxValue, numValue));
      const steppedValue = Math.round(clampedValue / step) * step;
      setInputValue(steppedValue.toString());
      onValueChange(steppedValue);
    }
  };

  // Generate scale markers
  const scaleMarkers = [];
  const markerCount = 5;
  const markerStep = (maxValue - minValue) / (markerCount - 1);

  for (let i = 0; i < markerCount; i++) {
    const markerValue = minValue + markerStep * i;
    scaleMarkers.push({
      value: Math.round(markerValue),
      position: (i / (markerCount - 1)) * 100,
    });
  }

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      <Text style={styles.label}>{label}</Text>

      {/* Input Field */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={handleInputChange}
          onBlur={handleInputBlur}
          keyboardType="numeric"
          selectTextOnFocus
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>

      {/* Visual Scale */}
      {showScale && (
        <View style={styles.scaleContainer}>
          {/* Scale Track */}
          <View style={styles.scaleTrack}>
            <LinearGradient
              colors={[colors.neutral, colors.neutral]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scaleTrackGradient}
            />
          </View>

          {/* Progress Fill */}
          <View style={[styles.scaleFill, { width: `${percentage}%` as DimensionValue }]}>
            <LinearGradient
              colors={gradient as unknown as readonly [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scaleFillGradient}
            />
          </View>

          {/* Animated Indicator */}
          <Animated.View style={[styles.indicator, animatedIndicatorStyle]}>
            <LinearGradient
              colors={gradient as unknown as readonly [string, string, ...string[]]}
              style={styles.indicatorGradient}
            />
            <View style={styles.indicatorTriangle} />
          </Animated.View>

          {/* Scale Markers */}
          <View style={styles.markersContainer}>
            {scaleMarkers.map((marker, index) => (
              <View
                key={index}
                style={[styles.marker, { left: `${marker.position}%` }]}
              >
                <View style={styles.markerLine} />
                <Text style={styles.markerText}>{marker.value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Value Display */}
      <View style={styles.valueDisplay}>
        <Text style={styles.currentValue}>Current: </Text>
        <Text style={styles.currentValueNumber}>
          {value} {unit}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  label: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },

  input: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },

  unit: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },

  scaleContainer: {
    position: "relative",
    height: rp(60),
    marginBottom: spacing.lg,
  },

  scaleTrack: {
    position: "absolute",
    top: rp(20),
    left: rp(16),
    right: rp(16),
    height: rp(8),
    borderRadius: rp(4),
    overflow: "hidden",
  },

  scaleTrackGradient: {
    flex: 1,
  },

  scaleFill: {
    position: "absolute",
    top: rp(20),
    left: rp(16),
    height: rp(8),
    borderRadius: rp(4),
    overflow: "hidden",
  },

  scaleFillGradient: {
    flex: 1,
  },

  indicator: {
    position: "absolute",
    top: rp(12),
    left: rp(16),
    width: rw(20),
    height: rp(24),
    alignItems: "center" as const,
  },

  indicatorGradient: {
    width: rw(20),
    height: rp(20),
    borderRadius: rp(10),
    boxShadow: '0px 2px 4px rgba(0,0,0,0.3)',
    elevation: 5,
  },

  indicatorTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: rp(6),
    borderRightWidth: rp(6),
    borderTopWidth: rp(8),
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.success,
    marginTop: -rp(2),
  },

  markersContainer: {
    position: "absolute",
    top: rp(40),
    left: rp(16),
    right: rp(16),
    flexDirection: "row",
  },

  marker: {
    position: "absolute",
    alignItems: "center" as const,
    transform: [{ translateX: -rp(15) }],
  },

  markerLine: {
    width: rp(1),
    height: rp(8),
    backgroundColor: colors.border,
    marginBottom: rp(4),
  },

  markerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },

  valueDisplay: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
  },

  currentValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },

  currentValueNumber: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
});
