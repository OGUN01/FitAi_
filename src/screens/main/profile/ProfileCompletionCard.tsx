/**
 * ProfileCompletionCard - Aurora 2026: full-width gradient progress bar + single text line
 * No card container, no nested sections.
 */

import React, { useMemo } from "react";
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
import { rf } from "../../../utils/responsive";

const { variants } = typography;

interface ProfileCompletionCardProps {
  personalInfoComplete: boolean;
  goalsComplete: boolean;
  measurementsComplete: boolean;
  preferencesComplete: boolean;
  onSectionPress: (sectionId: string) => void;
  animationDelay?: number;
}

export const ProfileCompletionCard: React.FC<ProfileCompletionCardProps> = React.memo(({
  personalInfoComplete,
  goalsComplete,
  measurementsComplete,
  preferencesComplete,
  animationDelay = 0,
}) => {
  const completedCount = useMemo(
    () =>
      [personalInfoComplete, goalsComplete, measurementsComplete, preferencesComplete].filter(
        Boolean,
      ).length,
    [personalInfoComplete, goalsComplete, measurementsComplete, preferencesComplete],
  );

  const totalCount = 4;
  const percentage = Math.round((completedCount / totalCount) * 100);

  if (percentage === 100) return null;

  const message =
    percentage >= 75
      ? "Almost there! Just a few more details."
      : percentage >= 50
        ? "Good progress! Keep going."
        : percentage >= 25
          ? "Great start! Complete your profile."
          : "Let's get started with your profile!";

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(350)}
      style={styles.container}
    >
      {/* Label row */}
      <View style={styles.labelRow}>
        <Ionicons
          name="person-circle-outline"
          size={rf(16)}
          color={colors.primary.DEFAULT}
        />
        <Text style={styles.label}>Complete Your Profile</Text>
        <Text style={styles.pct}>{percentage}%</Text>
      </View>

      {/* Gradient progress bar */}
      <View style={styles.track}>
        <LinearGradient
          colors={[colors.primary.DEFAULT, colors.secondary.DEFAULT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${percentage}%` }]}
        />
      </View>

      {/* Single text line */}
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  label: {
    ...variants.cardHeadline,
    color: colors.text.primary,
    flex: 1,
  },
  pct: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(14),
    color: colors.primary.DEFAULT,
  },
  track: {
    height: 6,
    backgroundColor: surface[2],
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  message: {
    ...variants.body,
    fontSize: rf(13),
    color: colors.text.secondary,
  },
});

export default ProfileCompletionCard;
