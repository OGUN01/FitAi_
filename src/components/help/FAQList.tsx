import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rw } from "../../utils/responsive";
import { FAQItem } from "../../hooks/useHelpSupport";
import { hexToRgba } from "../../utils/colors";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface FAQListProps {
  faqs: FAQItem[];
  expandedFaq: string | null;
  onToggleFaq: (id: string) => void;
}

export const FAQList: React.FC<FAQListProps> = ({
  faqs,
  expandedFaq,
  onToggleFaq,
}) => {
  const reducedMotion = useReducedMotion();
  return (
    <>
      {faqs.map((faq, index) => (
        <Animated.View
          key={faq.id}
          entering={
            reducedMotion ? undefined : FadeInDown.delay(300 + index * 50).duration(400)
          }
        >
          <AnimatedPressable
            onPress={() => onToggleFaq(faq.id)}
            scaleValue={0.98}
            hapticFeedback={false}
            accessibilityRole="button"
            // AnimatedPressable's inner <Pressable> unconditionally overwrites
            // accessibilityState with { disabled } after spreading our props, so
            // an `accessibilityState={{ expanded }}` passed through here is
            // silently discarded. Convey the expanded/collapsed state via the
            // label text instead so it still reaches VoiceOver/TalkBack.
            accessibilityLabel={`${faq.question}, ${
              expandedFaq === faq.id ? "expanded" : "collapsed"
            }`}
            accessibilityHint={
              expandedFaq === faq.id
                ? "Double tap to collapse"
                : "Double tap to expand"
            }
          >
            <GlassCard
              elevation={1}
              padding="md"
              blurIntensity="light"
              borderRadius="lg"
              style={
                StyleSheet.flatten(
                  expandedFaq === faq.id
                    ? [styles.faqCard, styles.faqCardExpanded]
                    : styles.faqCard
                ) as ViewStyle
              }
            >
              <View style={styles.faqHeader}>
                <View
                  style={[
                    styles.faqIcon,
                    // Preserves the original 0.15 alpha (was a hardcoded
                    // "rgba(255, 107, 53, 0.15)" literal) — only the fragile
                    // hex-append/literal is replaced, not the visual value.
                    { backgroundColor: hexToRgba(colors.primary, 0.15) },
                  ]}
                >
                  <Ionicons name={faq.icon} size={rf(16)} color={colors.primary} />
                </View>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <View
                  style={[
                    styles.expandIcon,
                    expandedFaq === faq.id && styles.expandIconExpanded,
                  ]}
                >
                  <Ionicons
                    name={
                      expandedFaq === faq.id ? "chevron-up" : "chevron-down"
                    }
                    size={rf(16)}
                    color={colors.textSecondary}
                  />
                </View>
              </View>

              {expandedFaq === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </GlassCard>
          </AnimatedPressable>
        </Animated.View>
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  faqCard: {
    marginBottom: spacing.sm,
    backgroundColor: colors.glassSurface,
  },
  faqCardExpanded: {
    backgroundColor: hexToRgba(colors.primary, 0.08),
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center" as const,
  },
  faqIcon: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(8),
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginRight: spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.white,
    marginRight: spacing.sm,
  },
  expandIcon: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  expandIconExpanded: {
    // hexToRgba(colors.primary, 32 / 255) is the exact equivalent of the
    // previous `${colors.primary}20` hex-append (0x20 = 32/255 alpha) —
    // same visual, without the fragile string-append pattern.
    backgroundColor: hexToRgba(colors.primary, 32 / 255),
  },
  faqAnswer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  faqAnswerText: {
    fontSize: rf(13),
    color: colors.textSecondary,
    lineHeight: rf(20),
  },
});
