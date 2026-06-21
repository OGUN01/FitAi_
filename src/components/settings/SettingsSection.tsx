/**
 * SettingsSection - Reusable Settings Group Component
 *
 * Features:
 * - Section title with optional badge
 * - Animated setting rows with proper icons (not text chevrons)
 * - Premium styling for subscription items
 * - Warning/destructive styling for dangerous actions
 * - Haptic feedback on all interactions
 * - Staggered entry animations
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

export interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  badge?: string;
  badgeColor?: string;
  showChevron?: boolean;
  isDestructive?: boolean;
  isPremium?: boolean;
  isIncomplete?: boolean; // Shows warning indicator
}

// Section header icons mapping
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

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  items,
  onItemPress,
  animationDelay = 0,
}) => {
  const sectionIcon = SECTION_ICONS[title];

  return (
    <Animated.View
      entering={FadeInRight.delay(animationDelay).duration(400)}
      style={styles.container}
    >
      <View style={styles.sectionHeader}>
        {sectionIcon && (
          <Ionicons
            name={sectionIcon}
            size={rf(14)}
            color={colors.textSecondary}
            style={styles.sectionIcon}
          />
        )}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <GlassCard
        elevation={1}
        padding="none"
        blurIntensity="light"
        borderRadius="lg"
        style={styles.card}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            <AnimatedPressable
              onPress={() => {
                haptics.light();
                onItemPress(item);
              }}
              scaleValue={0.98}
              hapticFeedback={false}
            >
              <View style={[styles.row, item.isPremium && styles.premiumRow]}>
                {/* Icon with colored background */}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: `${item.iconColor || colors.primary}18`,
                    },
                    item.isDestructive && styles.destructiveIconBg,
                    item.isPremium && styles.premiumIconBg,
                  ]}
                >
                  {item.isPremium ? (
                    <LinearGradient
                      colors={[colors.gold, colors.warning]}
                      style={styles.premiumIconGradient}
                    >
                      <Ionicons name={item.icon} size={rf(18)} color={colors.white} />
                    </LinearGradient>
                  ) : (
                    <Ionicons
                      name={item.icon}
                      size={rf(18)}
                      color={
                        item.isDestructive
                          ? colors.error
                          : item.iconColor || colors.primary
                      }
                    />
                  )}
                </View>

                {/* Text content */}
                <View style={styles.textContainer}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[
                        styles.title,
                        item.isDestructive && styles.destructiveText,
                        item.isPremium && styles.premiumText,
                      ]}
                    >
                      {item.title}
                    </Text>
                    {item.badge && (
                      <View
                        style={[
                          styles.badge,
                          {
                            backgroundColor:
                              item.badgeColor || colors.primary,
                          },
                          item.isPremium && styles.premiumBadge,
                        ]}
                      >
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    )}
                    {item.isIncomplete && <View style={styles.incompleteDot} />}
                  </View>
                  {item.subtitle && (
                    <Text
                      style={[
                        styles.subtitle,
                        item.isPremium && styles.premiumSubtitle,
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {item.subtitle}
                    </Text>
                  )}
                </View>

                {/* Chevron */}
                {item.showChevron !== false && (
                  <View style={styles.chevronContainer}>
                    <Ionicons
                      name="chevron-forward"
                      size={rf(18)}
                      color={
                        item.isPremium
                          ? colors.gold
                          : item.isDestructive
                            ? colors.error
                            : colors.textMuted
                      }
                    />
                  </View>
                )}
              </View>
            </AnimatedPressable>

            {index < items.length - 1 && (
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
              </View>
            )}
          </React.Fragment>
        ))}
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
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
    fontSize: rf(12),
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  card: {
    overflow: "hidden",
    backgroundColor: colors.glassSurface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: rh(60),
  },
  premiumRow: {
    backgroundColor: `${colors.gold}0D`,
  },
  iconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  destructiveIconBg: {
    backgroundColor: colors.errorTint,
  },
  premiumIconBg: {
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  premiumIconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: rbr(10),
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: rf(15),
    fontWeight: "500",
    color: colors.text,
  },
  destructiveText: {
    color: colors.error,
  },
  premiumText: {
    color: colors.gold,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  premiumSubtitle: {
    color: `${colors.gold}B3`,
  },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: rp(3),
    borderRadius: rbr(4),
  },
  premiumBadge: {
    backgroundColor: colors.gold,
  },
  badgeText: {
    fontSize: rf(9),
    fontWeight: "800",
    color: colors.white,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  incompleteDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
    backgroundColor: colors.warning,
    marginLeft: spacing.sm,
  },
  chevronContainer: {
    width: rw(24),
    alignItems: "center",
  },
  dividerContainer: {
    paddingLeft: rw(36) + spacing.md * 2,
  },
  divider: {
    height: rp(1),
    backgroundColor: colors.glassSurface,
  },
});

export default SettingsSection;
