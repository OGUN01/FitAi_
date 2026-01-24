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
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";
import { haptics } from "../../../utils/haptics";

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
            color={ResponsiveTheme.colors.textSecondary}
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
                      backgroundColor: `${item.iconColor || ResponsiveTheme.colors.primary}18`,
                    },
                    item.isDestructive && styles.destructiveIconBg,
                    item.isPremium && styles.premiumIconBg,
                  ]}
                >
                  {item.isPremium ? (
                    <LinearGradient
                      colors={["#FFD700", "#FFA500"]}
                      style={styles.premiumIconGradient}
                    >
                      <Ionicons name={item.icon} size={rf(18)} color="#fff" />
                    </LinearGradient>
                  ) : (
                    <Ionicons
                      name={item.icon}
                      size={rf(18)}
                      color={
                        item.isDestructive
                          ? ResponsiveTheme.colors.error
                          : item.iconColor || ResponsiveTheme.colors.primary
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
                              item.badgeColor || ResponsiveTheme.colors.primary,
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
                          ? "#FFD700"
                          : item.isDestructive
                            ? ResponsiveTheme.colors.error
                            : ResponsiveTheme.colors.textMuted
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
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  sectionIcon: {
    marginRight: ResponsiveTheme.spacing.xs,
  },
  sectionTitle: {
    fontSize: rf(12),
    fontWeight: "700",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  card: {
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    minHeight: rh(60),
  },
  premiumRow: {
    backgroundColor: "rgba(255, 215, 0, 0.05)",
  },
  iconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  destructiveIconBg: {
    backgroundColor: "rgba(244, 67, 54, 0.15)",
  },
  premiumIconBg: {
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  premiumIconGradient: {
    width: "100%",
    height: "100%",
    borderRadius: rw(10),
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
    color: "#fff",
  },
  destructiveText: {
    color: ResponsiveTheme.colors.error,
  },
  premiumText: {
    color: "#FFD700",
    fontWeight: "600",
  },
  subtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  premiumSubtitle: {
    color: "rgba(255, 215, 0, 0.7)",
  },
  badge: {
    marginLeft: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.xs + 2,
    paddingVertical: 3,
    borderRadius: rf(4),
  },
  premiumBadge: {
    backgroundColor: "#FFD700",
  },
  badgeText: {
    fontSize: rf(9),
    fontWeight: "800",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  incompleteDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
    backgroundColor: "#FF9800",
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  chevronContainer: {
    width: rw(24),
    alignItems: "center",
  },
  dividerContainer: {
    paddingLeft: rw(36) + ResponsiveTheme.spacing.md * 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
});

export default SettingsSection;
