/**
 * TogglePillRow — a row of meal/boolean toggles with an off-state strike-through.
 *
 * Each pill is a tap toggle. ON: accent tint + solid label. OFF: faint surface
 * + a strike-through line through the label so the user instantly sees which
 * meals are excluded — visual, not a checklist. selectionAsync on each toggle.
 *
 * Used for the Fuel screen's meal toggles (Breakfast/Lunch/Dinner/Snacks).
 */

import React, { useCallback } from "react";
import { StyleSheet, Pressable, View, ViewStyle, Text } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
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

const SPRING = { damping: 16, stiffness: 180 };

export interface TogglePillItem {
  id: string;
  label: string;
}

export interface TogglePillRowProps {
  items: TogglePillItem[];
  /** Map of itemId -> on/off. Missing = off. */
  value: Record<string, boolean>;
  onToggle: (id: string, next: boolean) => void;
  /** Accent color for the on-tint. @default colors.primary.DEFAULT */
  accentColor?: string;
  style?: ViewStyle;
  testID?: string;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const TogglePillRow: React.FC<TogglePillRowProps> = ({
  items,
  value,
  onToggle,
  accentColor = colors.primary.DEFAULT,
  style,
  testID,
}) => {
  const handle = useCallback(
    (id: string) => {
      fireSelection();
      onToggle(id, !value[id]);
    },
    [value, onToggle],
  );

  return (
    <View style={[styles.row, style]} testID={testID}>
      {items.map((item) => (
        <Pill
          key={item.id}
          item={item}
          on={!!value[item.id]}
          accentColor={accentColor}
          onPress={handle}
        />
      ))}
    </View>
  );
};

interface PillProps {
  item: TogglePillItem;
  on: boolean;
  accentColor: string;
  onPress: (id: string) => void;
}

const Pill: React.FC<PillProps> = ({ item, on, accentColor, onPress }) => {
  const scale = useSharedValue(1);
  const strikeOpacity = useSharedValue(on ? 0 : 1);

  React.useEffect(() => {
    scale.value = withSpring(on ? 1.04 : 1, SPRING);
    strikeOpacity.value = withTiming(on ? 0 : 1, { duration: 180 });
  }, [on, scale, strikeOpacity]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const strikeStyle = useAnimatedStyle(() => ({
    opacity: strikeOpacity.value,
  }));

  const onBg = hexToRgba(accentColor, TINT_ALPHA_LOW);

  return (
    <Animated.View style={[styles.pillWrap, pillStyle]}>
      <Pressable
        onPress={() => onPress(item.id)}
        style={[
          styles.pill,
          on
            ? { backgroundColor: onBg, borderColor: accentColor }
            : { backgroundColor: surface[1], borderColor: border.subtle },
        ]}
        accessibilityRole="switch"
        accessibilityState={{ checked: on }}
        accessibilityLabel={item.label}
      >
        <Text
          style={[
            styles.label,
            { color: on ? colors.text.primary : colors.text.tertiary },
          ]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {/* Strike-through when off */}
        <Animated.View
          style={[styles.strike, strikeStyle, on ? { backgroundColor: "transparent" } : { backgroundColor: colors.text.tertiary }]}
        />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pillWrap: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  pill: {
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
  strike: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    top: "50%",
    height: 1,
  },
});
