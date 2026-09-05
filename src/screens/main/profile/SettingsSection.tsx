/**
 * SettingsSection - Aurora 2026: clean iOS-style list
 * Icon in soft-tinted squircle + label + chevron, ONE surface, hairline separators.
 * No nested cards (max 1 surface depth).
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
  borderRadius,
  flatColors,
} from "../../../theme/aurora-tokens";
import { rf, rs, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

const { variants } = typography;

export interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
  badgeColor?: string;
  showChevron?: boolean;
  disabled?: boolean;
  isDestructive?: boolean;
  isPremium?: boolean;
  isIncomplete?: boolean;
  /** Renders a trailing Switch instead of a chevron; the row itself is
   * inert (only the Switch is interactive) so tapping it can't double-fire
   * alongside onValueChange. */
  toggle?: {
    value: boolean;
    onValueChange: (next: boolean) => void;
  };
}

interface SettingsSectionProps {
  title: string;
  items: SettingItem[];
  onItemPress: (item: SettingItem) => void;
  animationDelay?: number;
}

const SettingRow: React.FC<{
  item: SettingItem;
  isLast: boolean;
  onPress: (item: SettingItem) => void;
}> = React.memo(({ item, isLast, onPress }) => {
  const handlePress = useCallback(() => {
    if (item.disabled) return;
    haptics.light();
    onPress(item);
  }, [item, onPress]);

  const handleToggle = useCallback(
    (next: boolean) => {
      haptics.light();
      item.toggle?.onValueChange(next);
    },
    [item],
  );

  const isPremium = !!item.isPremium;
  // Single neutral icon system: every squircle is the same surface[2] tint
  // with a full-contrast glyph. Only destructive/premium rows carry a
  // semantic color — nothing is coded per-row anymore.
  const glyphColor = item.isDestructive
    ? colors.error.DEFAULT
    : isPremium
      ? flatColors.gold
      : colors.text.primary;

  const rowContent = (
    <>
      {/* Icon squircle */}
      <View
        style={[
          styles.iconSquircle,
          item.isDestructive && { backgroundColor: `${colors.error.DEFAULT}14` },
        ]}
      >
        <Ionicons
          name={item.icon}
          size={rs(18)}
          color={item.disabled ? colors.text.tertiary : glyphColor}
        />
      </View>

      {/* Text */}
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              item.isDestructive && styles.destructiveText,
              isPremium && styles.premiumTitle,
              item.disabled && styles.disabledTitle,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {item.badge && (
            <View
              style={[
                styles.badge,
                { backgroundColor: item.badgeColor || colors.primary.DEFAULT },
                isPremium && !item.badgeColor && styles.premiumBadge,
              ]}
            >
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
          {item.isIncomplete && <View style={styles.incompleteDot} />}
        </View>
        {item.subtitle && (
          <Text
            style={[styles.subtitle, item.disabled && styles.disabledSubtitle]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.subtitle}
          </Text>
        )}
      </View>

      {/* Trailing affordance — exactly one of: Switch (toggle), chevron
          (navigation), or nothing. Never ambiguous. */}
      {item.toggle ? (
        <Switch
          value={item.toggle.value}
          onValueChange={handleToggle}
          trackColor={{ false: surface[2], true: colors.primary.DEFAULT }}
          thumbColor={colors.text.primary}
          style={styles.toggle}
        />
      ) : (
        !item.disabled &&
        item.showChevron !== false && (
          <Ionicons
            name="chevron-forward"
            size={rs(18)}
            color={isPremium ? flatColors.gold : colors.text.tertiary}
            style={styles.chevron}
          />
        )
      )}
    </>
  );

  // A toggle row is inert as a whole — only the Switch itself is
  // interactive — so tapping the row body can't double-fire alongside
  // Switch's onValueChange.
  if (item.toggle) {
    return (
      <View style={styles.rowWrapper}>
        <View style={styles.row} accessibilityLabel={item.title}>
          {rowContent}
        </View>
        {!isLast && <View style={styles.divider} />}
      </View>
    );
  }

  return (
    <View style={styles.rowWrapper}>
      <Pressable
        onPress={handlePress}
        disabled={item.disabled}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={item.subtitle}
        accessibilityState={{ disabled: item.disabled }}
        style={({ pressed }) => [
          styles.row,
          isPremium && styles.rowPremium,
          pressed && !item.disabled && styles.rowPressed,
          item.disabled && styles.rowDisabled,
        ]}
      >
        {rowContent}
      </Pressable>
      {!isLast && <View style={styles.divider} />}
    </View>
  );
});

export const SettingsSection: React.FC<SettingsSectionProps> = React.memo(({
  title,
  items,
  onItemPress,
  animationDelay = 0,
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={
        reducedMotion ? undefined : FadeInDown.delay(animationDelay).duration(350)
      }
      style={styles.container}
    >
      {/* No visible header — the quick-jump chip row above is the single
          source of the section label, so this isn't repeated here. Kept as
          an accessibility label on the surface for screen readers. */}
      <View style={styles.listSurface} accessibilityLabel={`${title} settings`}>
        {items.map((item, index) => (
          <SettingRow
            key={item.id}
            item={item}
            isLast={index === items.length - 1}
            onPress={onItemPress}
          />
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  listSurface: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  rowWrapper: {
    // Positioning context for the absolutely-positioned inset divider.
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md + spacing.xxs,
    paddingHorizontal: spacing.md,
    minHeight: 64,
  },
  rowPremium: {
    backgroundColor: `${flatColors.gold}0D`,
  },
  rowPressed: {
    backgroundColor: surface[2],
  },
  rowDisabled: {
    // Dimming is carried entirely by disabledTitle/disabledSubtitle text
    // color — stacking opacity on top of already-dim token colors used to
    // push effective contrast below WCAG AA.
  },
  // Inset divider — a separate absolutely-positioned line rather than a
  // borderBottom on the row itself, so insetting it can't shift the row's
  // own content (a borderBottom + marginLeft on the row would push the
  // icon/text/chevron inward along with the line).
  divider: {
    position: "absolute",
    left: rw(32) + spacing.md,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: border.DEFAULT,
  },
  iconSquircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    overflow: "hidden",
    backgroundColor: surface[2],
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
  },
  textContainer: {
    flex: 1,
    flexShrink: 1,
    justifyContent: "center",
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    ...variants.body,
    color: colors.text.primary,
    flexShrink: 1,
  },
  destructiveText: {
    color: colors.error.DEFAULT,
  },
  premiumTitle: {
    color: flatColors.gold,
    fontFamily: "Manrope_600SemiBold",
  },
  disabledTitle: {
    color: colors.text.secondary,
  },
  subtitle: {
    ...variants.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  disabledSubtitle: {
    color: colors.text.tertiary,
  },
  premiumBadge: {
    backgroundColor: flatColors.gold,
  },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xxs,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(9),
    color: colors.text.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  incompleteDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
    backgroundColor: colors.warning.DEFAULT,
    marginLeft: spacing.sm,
  },
  chevron: {
    marginLeft: spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
  },
  toggle: {
    marginLeft: spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
  },
});

export default SettingsSection;
