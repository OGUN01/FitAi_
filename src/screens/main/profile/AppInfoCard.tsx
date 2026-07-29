/**
 * AppInfoCard - Aurora 2026: minimal centered app footer.
 * Sits directly on the screen background — no card surface.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  surface,
  spacing,
  typography,
} from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";

const { variants } = typography;

interface AppInfoCardProps {
  version?: string;
  animationDelay?: number;
}

export const AppInfoCard: React.FC<AppInfoCardProps> = ({
  version = "1.0.0",
  animationDelay = 0,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(350)}
      style={styles.container}
    >
      <LinearGradient
        colors={[colors.primary.DEFAULT, colors.secondary.DEFAULT]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logo}
      >
        <Text style={styles.logoText}>F</Text>
      </LinearGradient>

      <View style={styles.nameRow}>
        <Text style={styles.appName} numberOfLines={1}>
          FitAI
        </Text>
        <View style={styles.versionBadge}>
          <Text style={styles.versionText} numberOfLines={1}>
            v{version}
          </Text>
        </View>
      </View>

      <Text style={styles.tagline} numberOfLines={1}>
        Your AI-powered fitness companion
      </Text>

      <View style={styles.footerContent}>
        <Text style={styles.footerText}>Made with</Text>
        <Ionicons name="heart" size={rf(12)} color={colors.error.DEFAULT} />
        <Text style={styles.footerText}>for fitness enthusiasts</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  logo: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  logoText: {
    fontFamily: "Manrope_800ExtraBold",
    fontSize: rf(22),
    color: colors.text.primary,
    includeFontPadding: false,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xxs,
  },
  appName: {
    ...variants.cardHeadline,
    color: colors.text.primary,
  },
  versionBadge: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: spacing.xxs,
    backgroundColor: surface[2],
    borderRadius: 8,
  },
  versionText: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: rf(11),
    color: colors.text.secondary,
  },
  tagline: {
    ...variants.caption,
    color: colors.text.tertiary,
    marginBottom: spacing.sm,
  },
  footerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  footerText: {
    ...variants.caption,
    color: colors.text.tertiary,
  },
});

export default AppInfoCard;
