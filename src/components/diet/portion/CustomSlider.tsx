import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rh, rw, rbr } from "../../../utils/responsive";

interface CustomSliderProps {
  minimumValue: number;
  maximumValue: number;
  value: number;
  onValueChange: (value: number) => void;
  style?: StyleProp<ViewStyle>;
}

export const CustomSlider: React.FC<CustomSliderProps> = ({
  minimumValue,
  maximumValue,
  value,
  onValueChange,
  style,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const handleTrackPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const percentage = locationX / trackWidth;
    const newValue = minimumValue + (maximumValue - minimumValue) * percentage;
    const clampedValue = Math.max(
      minimumValue,
      Math.min(maximumValue, newValue),
    );
    onValueChange(clampedValue);
  };

  const getThumbPosition = () => {
    const percentage = (value - minimumValue) / (maximumValue - minimumValue);
    return percentage * (trackWidth - 24);
  };

  return (
    <View style={[styles.container, style]}>
      <View
        style={styles.track}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onTouchEnd={handleTrackPress}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${((value - minimumValue) / (maximumValue - minimumValue)) * 100}%`,
            },
          ]}
        />
        <View
          style={[
            styles.thumb,
            { left: getThumbPosition() },
            isDragging && styles.thumbActive,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: rh(40),
    justifyContent: "center",
    marginVertical: ResponsiveTheme.spacing.md,
  },
  track: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: rbr(2),
    position: "relative",
  },
  fill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(2),
    position: "absolute",
    left: 0,
    top: 0,
  },
  thumb: {
    position: "absolute",
    top: rh(-10),
    width: rw(24),
    height: rh(24),
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(12),
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.white,
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
    elevation: 4,
  },
  thumbActive: {
    transform: [{ scale: 1.2 }],
    boxShadow: '0px 2px 4px rgba(0,0,0,0.3)',
  },
});
