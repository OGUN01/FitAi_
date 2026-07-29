/**
 * GoalCarousel — horizontal snap-carousel of big tappable goal cards (S2 "Goal").
 *
 * The emotional peak of onboarding. Each goal is a large card (glyph + label);
 * swipe to browse, tap to multi-select with a check + spring. Selected cards
 * take the accent tint + a checkmark badge. selectionAsync on each toggle.
 *
 * FlatList with `snapToInterval` gives the swipe; Reanimated springs give the
 * tap reward. Cards are intentionally big so choosing a dream feels decisive.
 */

import React, { useCallback, useRef } from "react";
import {
  StyleSheet,
  Pressable,
  View,
  ViewStyle,
  Dimensions,
  ListRenderItemInfo,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = Math.min(SCREENW_CARD(), 220);

// Small helper to keep CARD_W stable across render (Dimensions in worklet-free scope).
function SCREENW_CARD(): number {
  return SCREEN_W - spacing.lg * 2;
}

const SELECT_SPRING = { damping: 14, stiffness: 150 };

export interface GoalOption {
  id: string;
  label: string;
  /** Ionicons glyph name. */
  icon: string;
  /** Short subtitle shown under the label. */
  subtitle?: string;
}

export interface GoalCarouselProps {
  options: GoalOption[];
  /** Array of selected goal ids (multi-select). */
  value: string[];
  onSelect: (id: string) => void;
  /** Accent color for selected cards. @default colors.primary.DEFAULT */
  accentColor?: string;
  style?: ViewStyle;
  testID?: string;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const GoalCarousel: React.FC<GoalCarouselProps> = ({
  options,
  value,
  onSelect,
  accentColor = colors.primary.DEFAULT,
  style,
  testID,
}) => {
  const selectedSet = new Set(value);
  const renderItem = useCallback(
    (info: ListRenderItemInfo<GoalOption>) => (
      <GoalCard
        option={info.item}
        selected={selectedSet.has(info.item.id)}
        accentColor={accentColor}
        onPress={onSelect}
      />
    ),
    [selectedSet, accentColor, onSelect],
  );

  return (
    <Animated.FlatList
      data={options}
      keyExtractor={(o) => o.id}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_W + spacing.md}
      decelerationRate="fast"
      contentContainerStyle={styles.list}
      style={[styles.container, style]}
      testID={testID}
    />
  );
};

interface GoalCardProps {
  option: GoalOption;
  selected: boolean;
  accentColor: string;
  onPress: (id: string) => void;
}

const GoalCard: React.FC<GoalCardProps> = ({
  option,
  selected,
  accentColor,
  onPress,
}) => {
  const scale = useSharedValue(1);
  const checkOpacity = useSharedValue(selected ? 1 : 0);

  React.useEffect(() => {
    scale.value = withSpring(selected ? 1.04 : 1, SELECT_SPRING);
    checkOpacity.value = withTiming(selected ? 1 : 0, { duration: 200 });
  }, [selected, scale, checkOpacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: checkOpacity.value }));

  const selectedBg = hexToRgba(accentColor, TINT_ALPHA_LOW);

  return (
    <Pressable
      onPress={() => {
        fireSelection();
        onPress(option.id);
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
      style={styles.cardOuter}
    >
      <Animated.View
        style={[
          styles.card,
          cardStyle,
          selected
            ? { backgroundColor: selectedBg, borderColor: accentColor }
            : { backgroundColor: surface[1], borderColor: border.subtle },
        ]}
      >
        {/* Check badge */}
        <Animated.View style={[styles.check, checkStyle, { backgroundColor: accentColor }]}>
          <Ionicons name="checkmark" size={14} color={colors.text.primary} />
        </Animated.View>

        <Ionicons
          name={option.icon as React.ComponentProps<typeof Ionicons>["name"]}
          size={36}
          color={selected ? accentColor : colors.text.secondary}
          style={styles.icon}
        />
        <Animated.Text
          style={[
            styles.label,
            { color: selected ? colors.text.primary : colors.text.secondary },
          ]}
          numberOfLines={2}
        >
          {option.label}
        </Animated.Text>
        {option.subtitle ? (
          <Animated.Text style={styles.subtitle} numberOfLines={2}>
            {option.subtitle}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -spacing.lg, // bleed to the screen edge so cards center
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  cardOuter: {
    width: CARD_W,
  },
  card: {
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    padding: spacing.lg,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 22,
    height: 22,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    textAlign: "center",
  },
  subtitle: {
    marginTop: spacing.xs,
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    lineHeight: typography.variants.caption.fontSize * typography.variants.caption.lineHeight,
    color: colors.text.tertiary,
    textAlign: "center",
  },
});
