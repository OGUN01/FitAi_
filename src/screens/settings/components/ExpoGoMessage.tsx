import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";

export const ExpoGoMessage: React.FC = () => {
  return (
    <View style={styles.expoGoContainer}>
      <Animated.View entering={FadeInDown.delay(100).duration(400)}>
        <GlassCard
          elevation={2}
          padding="xl"
          blurIntensity="default"
          borderRadius="xl"
          style={styles.expoGoCard}
        >
          <View style={styles.expoGoIconContainer}>
            <LinearGradient
              colors={["#FF9800", "#FF5722"]}
              style={styles.expoGoIcon}
            >
              <Ionicons name="warning-outline" size={rf(28)} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.expoGoTitle}>Notifications Unavailable</Text>
          <Text style={styles.expoGoMessage}>
            Notifications require a development build and are not available in
            Expo Go.
          </Text>
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>To enable, run:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                eas build --platform android --profile development
              </Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  expoGoContainer: {
    flex: 1,
    justifyContent: "center" as const,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  expoGoCard: {
    alignItems: "center" as const,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  expoGoIconContainer: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  expoGoIcon: {
    width: rw(64),
    height: rw(64),
    borderRadius: rw(32),
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  expoGoTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.sm,
    textAlign: "center",
  },
  expoGoMessage: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    lineHeight: rf(20),
  },
  codeContainer: {
    width: "100%",
  },
  codeLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  codeBox: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  codeText: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.primary,
    fontFamily: "monospace",
  },
});
