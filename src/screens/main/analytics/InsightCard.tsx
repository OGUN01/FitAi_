/**
 * InsightCard Component
 * Single accent left-border style (Aurora 2026) — no full heavy card.
 * Accent bar on the left, content on the right, chart palette accent.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import {
  colors,
  chart as chartColors,
  border as borderTokens,
  typography,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf, rw, rh } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";

export type InsightType =
  | "positive"
  | "negative"
  | "neutral"
  | "achievement"
  | "recommendation";

interface InsightCardProps {
  type: InsightType;
  title: string;
  description: string;
  category?: string;
  confidence?: number;
  actionText?: string;
  onAction?: () => void;
  delay?: number;
}

const ACCENT_MAP: Record<InsightType, { icon: string; color: string }> = {
  positive: { icon: "checkmark-circle", color: chartColors[4] },
  negative: { icon: "alert-circle", color: chartColors[6] },
  neutral: { icon: "information-circle", color: chartColors[5] },
  achievement: { icon: "trophy", color: chartColors[5] },
  recommendation: { icon: "bulb", color: chartColors[1] },
};

export const InsightCard: React.FC<InsightCardProps> = ({
  type,
  title,
  description,
  category,
  confidence,
  actionText,
  onAction,
  delay = 0,
}) => {
  const accent = ACCENT_MAP[type] ?? ACCENT_MAP.neutral;

  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()}>
      <AnimatedPressable
        onPress={onAction}
        scaleValue={onAction ? 0.97 : 1}
        hapticFeedback={!!onAction}
        hapticType="light"
        disabled={!onAction}
      >
        <View style={styles.container}>
          {/* Accent left border */}
          <View style={[styles.accentBar, { backgroundColor: accent.color }]} />

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Ionicons
                name={accent.icon as keyof typeof Ionicons.glyphMap}
                size={rf(18)}
                color={accent.color}
                style={styles.icon}
              />
              <View style={styles.titleBlock}>
                <Text style={[styles.title, { color: accent.color }]} numberOfLines={2}>
                  {title}
                </Text>
                {category && (
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: hexToRgba(accent.color, 0.12) },
                    ]}
                  >
                    <Text
                      style={[styles.categoryText, { color: accent.color }]}
                      numberOfLines={1}
                    >
                      {category}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Text style={styles.description} numberOfLines={3}>
              {description}
            </Text>

            {confidence !== undefined && (
              <View style={styles.confidenceRow}>
                <View style={styles.confidenceBar}>
                  <View
                    style={[
                      styles.confidenceFill,
                      {
                        width: `${confidence}%`,
                        backgroundColor: accent.color,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.confidenceText} numberOfLines={1}>
                  {confidence}%
                </Text>
              </View>
            )}

            {actionText && onAction && (
              <View style={styles.actionRow}>
                <Text style={[styles.actionText, { color: accent.color }]} numberOfLines={1}>
                  {actionText}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={rf(14)}
                  color={accent.color}
                />
              </View>
            )}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  accentBar: {
    width: rw(3),
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: {
    flexShrink: 0,
  },
  titleBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minWidth: 0,
  },
  title: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: rf(14),
    letterSpacing: 0.2,
    flexShrink: 1,
    minWidth: 0,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(10),
  },
  description: {
    fontFamily: typography.variants.body.fontFamily,
    fontSize: rf(13),
    color: colors.text.secondary,
    lineHeight: rf(19),
    marginLeft: rw(26),
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginLeft: rw(26),
  },
  confidenceBar: {
    flex: 1,
    height: rh(3),
    backgroundColor: borderTokens.subtle,
    borderRadius: rh(2),
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: rh(2),
  },
  confidenceText: {
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: rf(10),
    color: colors.text.secondary,
    minWidth: rw(28),
    textAlign: "right",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginLeft: rw(26),
    marginTop: spacing.xs,
  },
  actionText: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: rf(12),
  },
});

export default InsightCard;
