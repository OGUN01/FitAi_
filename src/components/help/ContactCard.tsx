import React from "react";
import { View, Text, StyleSheet, Linking } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

interface ContactCardProps {
  onContactEmail: () => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({ onContactEmail }) => {
  return (
    <Animated.View entering={FadeInDown.delay(800).duration(400)}>
      <GlassCard
        elevation={2}
        padding="lg"
        blurIntensity="default"
        borderRadius="xl"
        style={styles.contactCard}
      >
        <LinearGradient
          colors={["rgba(102, 126, 234, 0.15)", "rgba(118, 75, 162, 0.1)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.contactIconContainer}>
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={styles.contactIcon}
          >
            <Ionicons name="headset-outline" size={rf(24)} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.contactTitle}>Need immediate help?</Text>
        <Text style={styles.contactDescription}>
          Our support team typically responds within 24 hours.
        </Text>

        <View style={styles.contactMethods}>
          <AnimatedPressable
            onPress={onContactEmail}
            scaleValue={0.95}
            hapticFeedback={false}
            style={styles.contactMethodButton}
          >
            <View style={styles.contactMethod}>
              <Ionicons
                name="mail-outline"
                size={rf(16)}
                color={ResponsiveTheme.colors.primary}
              />
              <Text style={styles.contactMethodText}>support@fitai.app</Text>
            </View>
          </AnimatedPressable>
        </View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  contactCard: {
    alignItems: "center" as const,
    marginBottom: ResponsiveTheme.spacing.lg,
    overflow: "hidden",
  },
  contactIconContainer: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  contactIcon: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  contactTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.xs,
    textAlign: "center",
  },
  contactDescription: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(18),
  },
  contactMethods: {
    width: "100%",
  },
  contactMethodButton: {
    width: "100%",
  },
  contactMethod: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.md,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: ResponsiveTheme.borderRadius.lg,
  },
  contactMethodText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.primary,
  },
});
