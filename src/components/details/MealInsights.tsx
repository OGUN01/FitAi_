import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../ui";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rf, rw } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from '../../utils/colors';
import { MealInsight } from "../../hooks/useMealDetailLogic";

interface MealInsightsProps {
  insights: MealInsight[];
  notes?: string;
}

const FALLBACK_INSIGHT_ICON = "bulb-outline" as keyof typeof Ionicons.glyphMap;

// Whitelist of icon names the hook may emit; anything else falls back so we
// never pass an undefined/invalid name to Ionicons (which would render blank).
// Kept as a plain string array (not a typed Set) to avoid the readonly-Set
// covariance issue with the full Ionicons union type.
const KNOWN_INSIGHT_ICONS: readonly string[] = [
  "warning",
  "bulb-outline",
  "checkmark-circle",
  "alert-circle-outline",
  "flame-outline",
  "trending-up-outline",
  "trending-down-outline",
];

const resolveInsightIcon = (raw: unknown): keyof typeof Ionicons.glyphMap =>
  typeof raw === "string" && KNOWN_INSIGHT_ICONS.includes(raw)
    ? (raw as keyof typeof Ionicons.glyphMap)
    : FALLBACK_INSIGHT_ICON;

export const MealInsights: React.FC<MealInsightsProps> = ({
  insights,
  notes,
}) => {
  return (
    <>
      {notes ? (
        <Card style={styles.notesCard}>
          <View style={styles.titleRow}>
            <Ionicons name="create-outline" size={rf(18)} color={colors.secondary} />
            <Text style={styles.notesTitle} numberOfLines={1}>Meal Notes</Text>
          </View>
          <Text style={styles.notesText}>{notes}</Text>
        </Card>
      ) : null}

      <Card style={styles.insightsCard}>
        <View style={styles.titleRow}>
          <Ionicons name="bulb-outline" size={rf(18)} color={colors.info} />
          <Text style={styles.insightsTitle} numberOfLines={1}>Nutritional Insights</Text>
        </View>
        <View style={styles.insightsList}>
          {insights.length > 0 ? (
            insights.map((insight, index) => (
              <View
                key={`insight-${index}`}
                style={styles.insightItem}
                accessibilityRole="text"
                accessibilityLabel={insight.text ? `Insight: ${insight.text}` : "Insight"}
              >
                <Ionicons
                  name={resolveInsightIcon(insight.icon)}
                  size={rf(16)}
                  color={colors.info}
                  style={styles.insightIcon}
                />
                <Text
                  style={styles.insightText}
                  numberOfLines={3}
                >
                  {insight.text}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No insights available for this meal.</Text>
          )}
        </View>
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  notesCard: {
    marginBottom: spacing.md,
    backgroundColor: hexToRgba(colors.secondary, TINT_ALPHA_SOFT),
    borderWidth: Math.max(rw(1), 1),
    borderColor: hexToRgba(colors.secondary, TINT_ALPHA_MEDIUM),
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },

  notesTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.secondary,
  },

  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(20),
  },

  insightsCard: {
    marginBottom: spacing.xxl,
    backgroundColor: hexToRgba(colors.info, TINT_ALPHA_SOFT),
    borderWidth: Math.max(rw(1), 1),
    borderColor: hexToRgba(colors.info, TINT_ALPHA_MEDIUM),
  },

  insightsTitle: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.info,
  },

  insightsList: {
    gap: spacing.sm,
  },

  insightItem: {
    flexDirection: "row",
    alignItems: "flex-start" as const,
  },

  insightIcon: {
    marginRight: spacing.sm,
    marginTop: rf(2),
  },

  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(20),
  },

  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
});
