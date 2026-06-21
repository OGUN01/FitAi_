import { flatColors as colors, spacing, borderRadius, typography } from "../../../theme/aurora-tokens";
import React, { useEffect, type ComponentProps } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { rf, rs, rbr, rp } from "../../../utils/responsive";
import { AnimatedPressable } from "../../../components/ui/aurora";

interface CompactTogglePillProps {
  isActive: boolean;
  iconName: string;
  title: string;
  description: string;
  onToggle: () => void;
  onInfoPress: () => void;
}

export const CompactTogglePill: React.FC<CompactTogglePillProps> = ({
  isActive,
  iconName,
  title,
  description,
  onToggle,
  onInfoPress,
}) => {
  const toggleAnimation = useSharedValue(0);

  useEffect(() => {
    toggleAnimation.value = withTiming(isActive ? 1 : 0, { duration: 200 });
  }, [isActive]);

  const animatedSwitchStyle = useAnimatedStyle(() => {
    return {
      backgroundColor:
        toggleAnimation.value === 1
          ? colors.primary
          : colors.backgroundTertiary,
    };
  });

  const animatedThumbStyle = useAnimatedStyle(() => {
    const translateX = interpolate(toggleAnimation.value, [0, 1], [0, 16]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <AnimatedPressable
      onPress={onToggle}
      style={styles.compactPillContainer}
      scaleValue={0.98}
    >
      <View style={[styles.compactPill, isActive && styles.compactPillActive]}>
        {/* Single row layout: Icon + Title + Info + Toggle */}
        <View style={styles.compactPillRow}>
          {/* Icon */}
          <View style={styles.compactPillIconWrap}>
            <Ionicons
              name={iconName as ComponentProps<typeof Ionicons>['name']}
              size={rf(16)}
              color={
                isActive
                  ? colors.primary
                  : colors.textSecondary
              }
            />
          </View>

          {/* Title - takes remaining space */}
          <Text
            style={[
              styles.compactPillTitle,
              isActive && styles.compactPillTitleActive,
            ]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {title}
          </Text>

          {/* Info button */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              onInfoPress();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.compactPillInfoBtn}
            accessibilityRole="button"
            accessibilityLabel={`More info about ${title}`}
          >
            <Ionicons
              name="information-circle-outline"
              size={rf(16)}
              color={colors.textMuted}
            />
          </TouchableOpacity>

          {/* Toggle */}
          <Animated.View
            style={[styles.compactToggleSwitch, animatedSwitchStyle]}
          >
            <Animated.View
              style={[styles.compactToggleThumb, animatedThumbStyle]}
            />
          </Animated.View>
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  compactPillContainer: {
    width: "100%",
  },
  compactPill: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: "center",
  },
  compactPillActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  compactPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  compactPillIconWrap: {
    width: rf(24),
    height: rf(24),
    borderRadius: rf(12),
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  compactPillTitle: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    lineHeight: rf(18),
  },
  compactPillTitleActive: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  compactPillInfoBtn: {
    padding: spacing.xs,
  },
  compactToggleSwitch: {
    width: rs(38),
    height: rs(22),
    borderRadius: rbr(11),
    backgroundColor: colors.backgroundTertiary,
    justifyContent: "center",
    paddingHorizontal: rp(2),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  compactToggleThumb: {
    width: rs(18),
    height: rs(18),
    borderRadius: rbr(9),
    backgroundColor: colors.white,
  },
});
