import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";
import { FAQItem } from "../../hooks/useHelpSupport";

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
  return (
    <>
      {faqs.map((faq, index) => (
        <Animated.View
          key={faq.id}
          entering={FadeInDown.delay(300 + index * 50).duration(400)}
        >
          <AnimatedPressable
            onPress={() => onToggleFaq(faq.id)}
            scaleValue={0.98}
            hapticFeedback={false}
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
                    { backgroundColor: "rgba(255, 107, 53, 0.15)" },
                  ]}
                >
                  <Ionicons name={faq.icon} size={rf(16)} color={ResponsiveTheme.colors.primary} />
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
                    color={ResponsiveTheme.colors.textSecondary}
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
    marginBottom: ResponsiveTheme.spacing.sm,
    backgroundColor: ResponsiveTheme.colors.glassSurface,
  },
  faqCardExpanded: {
    backgroundColor: "rgba(255, 107, 53, 0.08)",
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
    marginRight: ResponsiveTheme.spacing.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
    marginRight: ResponsiveTheme.spacing.sm,
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
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
  },
  faqAnswer: {
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
  },
  faqAnswerText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },
});
