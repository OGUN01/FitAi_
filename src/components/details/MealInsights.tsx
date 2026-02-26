import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from '../../utils/constants';
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
    marginBottom: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.secondary + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.secondary + "30",
  },

  notesTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.secondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  notesText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 20,
  },

  insightsCard: {
    marginBottom: ResponsiveTheme.spacing.xxl,
    backgroundColor: ResponsiveTheme.colors.info + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.info + "30",
  },

  insightsTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.info,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  insightsList: {
    gap: ResponsiveTheme.spacing.xs,
  },

  insightItem: {
    flexDirection: "row",
    alignItems: "center" as const,
  },

  insightIcon: {
    fontSize: ResponsiveTheme.fontSize.sm,
    marginRight: ResponsiveTheme.spacing.sm,
  },

  insightText: {
    flex: 1,
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
});
