import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolateColor,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { rf, rp } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";

export interface ChipOption {
  id: string;
  label: string;
  value: string;
}

interface ChipSelectorProps {
  options: ChipOption[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  multiSelect?: boolean;
  animated?: boolean;
  gradient?: string[];
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const Chip: React.FC<{
  option: ChipOption;
  isSelected: boolean;
  onPress: () => void;
  animated: boolean;
  gradient: string[];
}> = ({ option, isSelected, onPress, animated, gradient }) => {
  const scale = useSharedValue(1);
  const progress = useSharedValue(0);

  React.useEffect(() => {
    if (animated) {
      progress.value = withSpring(isSelected ? 1 : 0, {
        damping: 20,
        stiffness: 150,
      });
    } else {
      progress.value = isSelected ? 1 : 0;
    }
  }, [isSelected]);

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      [ResponsiveTheme.colors.backgroundTertiary, gradient[0]],
    );

    return {
      backgroundColor,
      transform: [{ scale: scale.value }],
      borderColor: isSelected ? gradient[0] : ResponsiveTheme.colors.border,
    };
  });

  const animatedTextStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, 1],
      [ResponsiveTheme.colors.text, ResponsiveTheme.colors.white],
    );

    return { color };
  });

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 300 }),
    );
    onPress();
  };

  return (
    <AnimatedTouchable
      activeOpacity={0.8}
      onPress={handlePress}
      style={[styles.chip, animatedStyle]}
    >
      {isSelected && (
        <LinearGradient
          colors={gradient as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chipGradient}
        />
      )}
      <Animated.Text style={[styles.chipText, animatedTextStyle]}>
        {option.label}
      </Animated.Text>
    </AnimatedTouchable>
  );
};

export const ChipSelector: React.FC<ChipSelectorProps> = ({
  options,
  selectedIds,
  onSelectionChange,
  multiSelect = true,
  animated = true,
  gradient = ["#4CAF50", "#45A049"],
  style,
}) => {
  const handleChipPress = (id: string) => {
    if (multiSelect) {
      // Multi-select mode
      const newSelection = selectedIds.includes(id)
        ? selectedIds.filter((selectedId) => selectedId !== id)
        : [...selectedIds, id];
      onSelectionChange(newSelection);
    } else {
      // Single-select mode
      onSelectionChange([id]);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.chipsContainer}>
        {options.map((option) => (
          <Chip
            key={option.id}
            option={option}
            isSelected={selectedIds.includes(option.id)}
            onPress={() => handleChipPress(option.id)}
            animated={animated}
            gradient={gradient}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },

  chip: {
    position: "relative",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.full,
    borderWidth: 2,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  chipGradient: {
    ...StyleSheet.absoluteFillObject,
  },

  chipText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    textAlign: "center",
  },
});
