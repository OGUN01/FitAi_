import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";

interface RecommendationsSectionProps {
  recommendations?: string[];
  alternatives?: string[];
}

export const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  recommendations,
  alternatives,
}) => (
  <>
    {recommendations && recommendations.length > 0 && (
      <View style={styles.recommendationsContainer}>
        <Text style={styles.sectionTitle}>💡 Recommendations</Text>
        {recommendations.map((recommendation) => (
          <View key={recommendation} style={styles.recommendationItem}>
            <Text style={styles.recommendationText}>• {recommendation}</Text>
          </View>
        ))}
      </View>
    )}

    {alternatives && alternatives.length > 0 && (
      <View style={styles.alternativesContainer}>
        <Text style={styles.sectionTitle}>🔄 Healthier Alternatives</Text>
        {alternatives.map((alternative) => (
          <View key={alternative} style={styles.alternativeItem}>
            <Text style={styles.alternativeText}>• {alternative}</Text>
          </View>
        ))}
      </View>
    )}
  </>
);

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  recommendationsContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  recommendationItem: {
    marginBottom: THEME.spacing.sm,
  },
  recommendationText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    lineHeight: 20,
  },
  alternativesContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  alternativeItem: {
    marginBottom: THEME.spacing.sm,
  },
  alternativeText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    lineHeight: 20,
  },
});
