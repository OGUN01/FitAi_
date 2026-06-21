/**
 * InsightCard Component
 * Displays AI-powered insights with visual hierarchy
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
import { rf, rw, rh } from "../../utils/responsive";

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

const getInsightConfig = (type: InsightType) => {
  switch (type) {
    case "positive":
      return {
        icon: "checkmark-circle" as const,
        color: colors.success,
        gradientColors: ["rgba(76,175,80,0.15)", "rgba(76,175,80,0.05)"] as [
          string,
          string,
        ],
        borderColor: "rgba(76,175,80,0.3)",
      };
    case "negative":
      return {
        icon: "alert-circle" as const,
        color: colors.error,
        gradientColors: ["rgba(244,67,54,0.15)", "rgba(244,67,54,0.05)"] as [
          string,
          string,
        ],
        borderColor: "rgba(244,67,54,0.3)",
      };
    case "neutral":
      return {
        icon: "information-circle" as const,
        color: colors.warning,
        gradientColors: ["rgba(255,152,0,0.15)", "rgba(255,152,0,0.05)"] as [
          string,
          string,
        ],
        borderColor: "rgba(255,152,0,0.3)",
      };
    case "achievement":
      return {
        icon: "trophy" as const,
        color: colors.gold,
        gradientColors: ["rgba(255,215,0,0.15)", "rgba(255,215,0,0.05)"] as [
          string,
          string,
        ],
        borderColor: "rgba(255,215,0,0.3)",
      };
    case "recommendation":
      return {
        icon: "bulb" as const,
        color: colors.primary,
        gradientColors: [
          "rgba(255,107,53,0.15)",
          "rgba(255,107,53,0.05)",
        ] as [string, string],
        borderColor: "rgba(255,107,53,0.3)",
      };
    default:
      return {
        icon: "information-circle" as const,
        color: colors.neutral,
        gradientColors: [
          "rgba(158,158,158,0.15)",
          "rgba(158,158,158,0.05)",
        ] as [string, string],
        borderColor: "rgba(158,158,158,0.3)",
      };
  }
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
  const config = getInsightConfig(type);

  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()}>
      <AnimatedPressable
        onPress={onAction}
        scaleValue={onAction ? 0.98 : 1}
        hapticFeedback={!!onAction}
        hapticType="light"
        disabled={!onAction}
      >
        <View style={[styles.container, { borderColor: config.borderColor }]}>
          <LinearGradient
            colors={config.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.content}>
              {/* Icon & Header Row */}
              <View style={styles.headerRow}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${config.color}25` },
                  ]}
                >
                  <Ionicons
                    name={config.icon}
                    size={rf(18)}
                    color={config.color}
                  />
                </View>

                <View style={styles.headerContent}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, { color: config.color }]}>
                      {title}
                    </Text>
                    {category && (
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: `${config.color}20` },
                        ]}
                      >
                        <Text
                          style={[styles.categoryText, { color: config.color }]}
                        >
                          {category}
                        </Text>
                      </View>
                    )}
                  </View>

                  {confidence !== undefined && (
                    <View style={styles.confidenceRow}>
                      <View style={styles.confidenceBar}>
                        <View
                          style={[
                            styles.confidenceFill,
                            {
                              width: `${confidence}%`,
                              backgroundColor: config.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.confidenceText}>{confidence}%</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Description */}
              <Text style={styles.description}>{description}</Text>

              {/* Action Button */}
              {actionText && onAction && (
                <View style={styles.actionContainer}>
                  <View
                    style={[
                      styles.actionButton,
                      { backgroundColor: `${config.color}20` },
                    ]}
                  >
                    <Text style={[styles.actionText, { color: config.color }]}>
                      {actionText}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={rf(14)}
                      color={config.color}
                    />
                  </View>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

// AI Recommendation Banner Component (special variant)
export const AIRecommendationBanner: React.FC<{
  recommendation: string;
  onLearnMore?: () => void;
}> = ({ recommendation, onLearnMore }) => {
  return (
    <AnimatedPressable
      onPress={onLearnMore}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
    >
      <View style={styles.aiContainer}>
        <LinearGradient
          colors={["rgba(255,107,53,0.15)", "rgba(255,138,92,0.15)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiGradient}
        >
          <View style={styles.aiContent}>
            <View style={styles.aiHeader}>
              <LinearGradient
                colors={[colors.primary, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiIconContainer}
              >
                <Ionicons name="sparkles" size={rf(14)} color={colors.white} />
              </LinearGradient>
              <Text style={styles.aiTitle}>AI Recommendation</Text>
            </View>
            <Text style={styles.aiText}>{recommendation}</Text>
            {onLearnMore && (
              <View style={styles.aiAction}>
                <Text style={styles.aiActionText}>Learn More</Text>
                <Ionicons name="arrow-forward" size={rf(14)} color={colors.primary} />
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.sm,
  },
  iconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  title: {
    fontSize: rf(14),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: rf(10),
    fontWeight: "600",
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  confidenceBar: {
    flex: 1,
    height: rh(4),
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: rh(2),
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: rh(2),
  },
  confidenceText: {
    fontSize: rf(10),
    fontWeight: "600",
    color: colors.textSecondary,
    minWidth: rw(30),
    textAlign: "right",
  },
  description: {
    fontSize: rf(13),
    fontWeight: "500",
    color: colors.text,
    lineHeight: rf(19),
    marginLeft: rw(36) + spacing.sm,
  },
  actionContainer: {
    marginTop: spacing.sm,
    marginLeft: rw(36) + spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  actionText: {
    fontSize: rf(12),
    fontWeight: "600",
  },

  // AI Recommendation Banner Styles
  aiContainer: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,107,53,0.3)",
  },
  aiGradient: {
    flex: 1,
  },
  aiContent: {
    padding: spacing.lg,
  },
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  aiIconContainer: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(8),
    backgroundColor: "rgba(255,107,53,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.3,
  },
  aiText: {
    fontSize: rf(13),
    fontWeight: "500",
    color: colors.text,
    lineHeight: rf(20),
  },
  aiAction: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  aiActionText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.primary,
  },
});

export default InsightCard;
