/**
 * SettingsSection - Aurora 2026: clean iOS-style list
 * Icon in soft-tinted squircle + label + chevron, ONE surface, hairline separators.
 * No nested cards (max 1 surface depth).
 */

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  colors,
  surface,
  border,
  spacing,
  typography,
  borderRadius,
  flatColors,
} from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

const { variants } = typography;

export interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
  showChevron?: boolean;
  disabled?: boolean;
  isDestructive?: boolean;
  isPremium?: boolean;
  isIncomplete?: boolean;
}

const SECTION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Account: "person-circle-outline",
  Preferences: "settings-outline",
  App: "apps-outline",
  Data: "cloud-outline",
};

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

  const isPremium = !!item.isPremium;
  const iconColor = item.isDestructive
    ? colors.error.DEFAULT
    : isPremium
      ? flatColors.gold
      : item.iconColor || colors.primary.DEFAULT;

  return (
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
        !isLast && styles.rowBorder,
      ]}
    >
      {/* Icon squircle */}
      {isPremium ? (
        <LinearGradient
          colors={[flatColors.gold, colors.warning.DEFAULT]}
          style={styles.iconSquircle}
        >
          <Ionicons name={item.icon} size={rf(18)} color={colors.text.primary} />
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.iconSquircle,
            { backgroundColor: `${iconColor}14` },
            item.isDestructive && { backgroundColor: `${colors.error.DEFAULT}14` },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={rf(18)}
            color={item.disabled ? colors.text.tertiary : iconColor}
          />
        </View>
      )}

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

      {/* Chevron */}
      {!item.disabled && item.showChevron !== false && (
        <Ionicons
          name="chevron-forward"
          size={rf(18)}
          color={isPremium ? flatColors.gold : colors.text.tertiary}
          style={styles.chevron}
        />
      )}
    </Pressable>
  );
});

export const SettingsSection: React.FC<SettingsSectionProps> = React.memo(({
  title,
  items,
  onItemPress,
  animationDelay = 0,
}) => {
  const reducedMotion = useReducedMotion();
  const sectionIcon = SECTION_ICONS[title];

  return (
    <Animated.View
      entering={
        reducedMotion ? undefined : FadeInDown.delay(animationDelay).duration(350)
      }
      style={styles.container}
    >
      {/* Section header */}
      <View style={styles.sectionHeader}>
        {sectionIcon && (
          <Ionicons
            name={sectionIcon}
            size={rf(14)}
            color={colors.text.secondary}
            style={styles.sectionIcon}
          />
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {/* Single surface list */}
      <View style={styles.listSurface}>
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
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionIcon: {
    marginRight: spacing.xs,
  },
  sectionTitle: {
    ...variants.caption,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  listSurface: {
    backgroundColor: surface[1],
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: border.subtle,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  rowPremium: {
    backgroundColor: `${flatColors.gold}0D`,
  },
  rowPressed: {
    backgroundColor: surface[2],
  },
  rowDisabled: {
    opacity: 0.5,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: border.DEFAULT,
  },
  iconSquircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    overflow: "hidden",
  },
  textContainer: {
    flex: 1,
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
    marginTop: spacing.xxs,
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
  },
});

export default SettingsSection;
