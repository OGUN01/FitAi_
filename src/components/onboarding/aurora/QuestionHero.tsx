/**
 * QuestionHero — the single focal-question header for every onboarding screen
 * ("Better than 2026" redesign).
 *
 * Editorial LEFT-ALIGNED (a coach's line), not a centered form label. Big
 * extrabold Manrope question + one-line secondary reassurance on pure black,
 * with generous top padding so the screen reads as one calm question with
 * room to breathe. No orb, no glow, no eyebrow — restraint is the luxury
 * signal (the lesson from the purple/orb failures).
 *
 * Fades/slides in (FadeInDown 400ms) so each screen's question lands.
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { spacing, typography, colors } from "../../../theme/aurora-tokens";

export interface QuestionHeroProps {
  /** The big lead question. */
  question: string;
  /** One-line reassurance underneath (secondary text). */
  reassurance?: string;
  /** Extra container style. */
  style?: ViewStyle;
  testID?: string;
}

export const QuestionHero: React.FC<QuestionHeroProps> = ({
  question,
  reassurance,
  style,
  testID,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[styles.container, style]}
      testID={testID}
    >
      <Animated.Text style={styles.question} numberOfLines={3}>
        {question}
      </Animated.Text>
      {reassurance ? (
        <Animated.Text style={styles.reassurance} numberOfLines={2}>
          {reassurance}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    alignItems: "flex-start",
  },
  question: {
    fontFamily: typography.variants.heroStat.fontFamily, // Manrope_800ExtraBold
    fontSize: 30,
    lineHeight: 30 * 1.15,
    color: colors.text.primary,
    letterSpacing: -0.5,
    textAlign: "left",
  },
  reassurance: {
    marginTop: spacing.sm,
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    lineHeight: typography.variants.body.fontSize * typography.variants.body.lineHeight,
    color: colors.text.secondary,
    textAlign: "left",
  },
});
