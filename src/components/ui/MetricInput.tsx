import React, { useEffect } from "react";
import { View, Text, TextInput, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { rf, rp, rw } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

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
  gradient = ["#4CAF50", "#45A049"],
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
              colors={["#E0E0E0", "#BDBDBD"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scaleTrackGradient}
            />
          </View>

          {/* Progress Fill */}
          <View style={[styles.scaleFill, { width: `${percentage}%` } as any]}>
            <LinearGradient
              colors={gradient as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.scaleFillGradient}
            />
          </View>

          {/* Animated Indicator */}
          <Animated.View style={[styles.indicator, animatedIndicatorStyle]}>
            <LinearGradient
              colors={gradient as any}
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
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.border,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  input: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  unit: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },

  scaleContainer: {
    position: "relative",
    height: rp(60),
    marginBottom: ResponsiveTheme.spacing.lg,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
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
    borderTopColor: "#4CAF50",
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
    backgroundColor: ResponsiveTheme.colors.border,
    marginBottom: rp(4),
  },

  markerText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  valueDisplay: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  currentValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  currentValueNumber: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
  },
});
