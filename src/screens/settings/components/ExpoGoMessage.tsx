import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, borderRadius, surface, border } from "../../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../../theme/fonts";
import { rf, rw, rbr } from "../../../utils/responsive";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

export const ExpoGoMessage: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <View style={styles.expoGoContainer}>
      <Animated.View
        entering={reducedMotion ? undefined : FadeInDown.delay(100).duration(400)}
      >
        <View style={styles.expoGoCard}>
          <View style={styles.expoGoIconContainer}>
            {/* Flat fill, not a gradient — DESIGN.md's de-gradient rule
                (gradients are reserved for genuine brand moments only). */}
            <View style={styles.expoGoIcon}>
              <Ionicons name="warning-outline" size={rf(28)} color={colors.background.DEFAULT} />
            </View>
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
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  expoGoContainer: {
    flex: 1,
    justifyContent: "center" as const,
    paddingHorizontal: spacing.lg,
  },
  expoGoCard: {
    alignItems: "center" as const,
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.card,
    padding: spacing.xl,
  },
  expoGoIconContainer: {
    marginBottom: spacing.lg,
    alignItems: "center" as const,
  },
  expoGoIcon: {
    width: rw(64),
    height: rw(64),
    borderRadius: rbr(32),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: colors.warning.DEFAULT,
  },
  expoGoTitle: {
    fontFamily: FONT_FAMILY.bold,
    fontSize: rf(20),
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  expoGoMessage: {
    fontSize: rf(14),
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: rf(20),
  },
  codeContainer: {
    width: "100%",
    alignItems: "center" as const,
  },
  codeLabel: {
    fontSize: rf(12),
    color: colors.text.tertiary,
    marginBottom: spacing.xs,
    textAlign: "center" as const,
  },
  codeBox: {
    width: "100%",
    backgroundColor: surface[2],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  codeText: {
    fontSize: rf(11),
    color: colors.primary.DEFAULT,
    fontFamily: "monospace",
    textAlign: "center",
  },
});
