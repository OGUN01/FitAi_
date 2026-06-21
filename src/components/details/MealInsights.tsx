import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { MealInsight } from "../../hooks/useMealDetailLogic";

interface MealInsightsProps {
  insights: MealInsight[];
  notes?: string;
}

export const MealInsights: React.FC<MealInsightsProps> = ({
  insights,
  notes,
}) => {
  return (
    <>
      {notes && (
        <Card style={styles.notesCard}>
          <Text style={styles.notesTitle}>📝 Meal Notes</Text>
          <Text style={styles.notesText}>{notes}</Text>
        </Card>
      )}

      <Card style={styles.insightsCard}>
        <Text style={styles.insightsTitle}>💡 Nutritional Insights</Text>
        <View style={styles.insightsList}>
          {insights.map((insight, index) => (
            <View key={index} style={styles.insightItem}>
              <Text style={styles.insightIcon}>{insight.icon}</Text>
              <Text style={styles.insightText}>{insight.text}</Text>
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
    backgroundColor: colors.secondary + "10",
    borderWidth: 1,
    borderColor: colors.secondary + "30",
  },

  notesTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.secondary,
    marginBottom: spacing.sm,
  },

  notesText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  insightsCard: {
    marginBottom: spacing.xxl,
    backgroundColor: colors.info + "10",
    borderWidth: 1,
    borderColor: colors.info + "30",
  },

  insightsTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.info,
    marginBottom: spacing.sm,
  },

  insightsList: {
    gap: spacing.xs,
  },

  insightItem: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  insightIcon: {
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
  },

  insightText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
