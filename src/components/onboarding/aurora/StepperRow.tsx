/**
 * StepperRow — horizontal N-step selector with a live readout + haptic.
 *
 * A row of equal-width segment buttons. The active segment fills with the
 * accent tint + accent border; selecting animates the fill via withSpring and
 * fires selectionAsync. A live readout label sits above (optional).
 *
 * Used for ordered, few-option choices (cooking skill, activity level,
 * intensity) where a slider is overkill but a chip grid is too flat.
 */

import React, { useCallback } from "react";
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  surface,
  border,
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";

const SELECT_SPRING = { damping: 16, stiffness: 160 };

export interface StepperOption {
  id: string;
  label: string;
}

export interface StepperRowProps {
  options: StepperOption[];
  value: string;
  onSelect: (id: string) => void;
  /** Accent color for the active segment. @default colors.primary.DEFAULT */
  accentColor?: string;
  /** Optional live readout label rendered above the row. */
  readout?: string;
  style?: ViewStyle;
  testID?: string;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const StepperRow: React.FC<StepperRowProps> = ({
  options,
  value,
  onSelect,
  accentColor = colors.primary.DEFAULT,
  readout,
  style,
  testID,
}) => {
  const handle = useCallback(
    (id: string) => {
      fireSelection();
      onSelect(id);
    },
    [onSelect],
  );

  return (
    <View style={[styles.container, style]} testID={testID}>
      {readout ? (
        <Animated.Text style={styles.readout}>{readout}</Animated.Text>
      ) : null}
      <View style={styles.row}>
        {options.map((opt, i) => (
          <Segment
            key={opt.id}
            option={opt}
            selected={opt.id === value}
            accentColor={accentColor}
            isFirst={i === 0}
            isLast={i === options.length - 1}
            onPress={handle}
          />
        ))}
      </View>
    </View>
  );
};

interface SegmentProps {
  option: StepperOption;
  selected: boolean;
  accentColor: string;
  isFirst: boolean;
  isLast: boolean;
  onPress: (id: string) => void;
}

const Segment: React.FC<SegmentProps> = ({
  option,
  selected,
  accentColor,
  isFirst,
  isLast,
  onPress,
}) => {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.03 : 1, SELECT_SPRING);
  }, [selected, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const selectedBg = hexToRgba(accentColor, TINT_ALPHA_LOW);

  return (
    <Animated.View
      style={[
        styles.segmentWrap,
        isFirst && styles.first,
        isLast && styles.last,
      ]}
    >
      <Pressable
        onPress={() => onPress(option.id)}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={option.label}
      >
        <Animated.View
          style={[
            styles.segment,
            animStyle,
            selected
              ? { backgroundColor: selectedBg, borderColor: accentColor }
              : { backgroundColor: surface[1], borderColor: border.subtle },
          ]}
        >
          <Animated.Text
            style={[
              styles.label,
              { color: selected ? colors.text.primary : colors.text.secondary },
            ]}
            numberOfLines={1}
          >
            {option.label}
          </Animated.Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  readout: {
    fontFamily: typography.variants.caption2.fontFamily,
    fontSize: typography.variants.caption2.fontSize,
    color: colors.text.tertiary,
  },
  row: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  segmentWrap: {
    flex: 1,
  },
  first: {},
  last: {},
  segment: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  label: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    lineHeight: typography.variants.cardHeadline.lineHeight,
  },
});
