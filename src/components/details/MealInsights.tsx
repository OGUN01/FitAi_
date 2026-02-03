import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../ui";
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
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.secondary + "10",
    borderWidth: 1,
    borderColor: THEME.colors.secondary + "30",
  },

  notesTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.secondary,
    marginBottom: THEME.spacing.sm,
  },

  notesText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
  },

  insightsCard: {
    marginBottom: THEME.spacing.xxl,
    backgroundColor: THEME.colors.info + "10",
    borderWidth: 1,
    borderColor: THEME.colors.info + "30",
  },

  insightsTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.info,
    marginBottom: THEME.spacing.sm,
  },

  insightsList: {
    gap: THEME.spacing.xs,
  },

  insightItem: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  insightIcon: {
    fontSize: THEME.fontSize.sm,
    marginRight: THEME.spacing.sm,
  },

  insightText: {
    flex: 1,
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
  },
});
