import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../ui";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rf } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW, TINT_ALPHA_MEDIUM } from '../../utils/colors';
import { MealInsight } from "../../hooks/useMealDetailLogic";

interface MealInsightsProps {
  insights: MealInsight[];
  notes?: string;
}

const FALLBACK_INSIGHT_ICON = "bulb-outline";

export const MealInsights: React.FC<MealInsightsProps> = ({
  insights,
  notes,
}) => {
  return (
    <>
      {notes && (
        <Card style={styles.notesCard}>
          <View style={styles.titleRow}>
            <Ionicons name="create-outline" size={rf(18)} color={colors.secondary} />
            <Text style={styles.notesTitle}>Meal Notes</Text>
          </View>
          <Text style={styles.notesText} numberOfLines={6}>{notes}</Text>
        </Card>
      )}

      <Card style={styles.insightsCard}>
        <View style={styles.titleRow}>
          <Ionicons name="bulb-outline" size={rf(18)} color={colors.info} />
          <Text style={styles.insightsTitle}>Nutritional Insights</Text>
        </View>
        <View style={styles.insightsList}>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Ionicons
                name={(insight.icon as any) || FALLBACK_INSIGHT_ICON}
                size={rf(16)}
                color={colors.info}
                style={styles.insightIcon}
                accessibilityLabel={insight.text ? `Insight: ${insight.text}` : "Insight"}
                accessibilityRole="image"
              />
              <Text style={styles.insightText} numberOfLines={3}>{insight.text}</Text>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
};

const styles = StyleSheet.create({
  notesCard: {
    marginBottom: spacing.md,
    backgroundColor: hexToRgba(colors.secondary, TINT_ALPHA_LOW + 0.08),
    borderWidth: 1,
    borderColor: hexToRgba(colors.secondary, TINT_ALPHA_MEDIUM),
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },

  notesTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.secondary,
  },

  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  insightsCard: {
    marginBottom: spacing.xxl,
    backgroundColor: hexToRgba(colors.info, TINT_ALPHA_LOW + 0.08),
    borderWidth: 1,
    borderColor: hexToRgba(colors.info, TINT_ALPHA_MEDIUM),
  },

  insightsTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.info,
  },

  insightsList: {
    gap: spacing.sm,
  },

  insightItem: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  insightIcon: {
    marginRight: spacing.sm,
  },

  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
