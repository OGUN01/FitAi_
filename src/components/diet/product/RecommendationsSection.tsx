import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  flatColors as colors,
  spacing,
  flatFontSize as fontSize,
  typography,
} from '../../../theme/aurora-tokens';
import { rf } from '../../../utils/responsive';

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
        <View style={styles.sectionTitleRow}>
          <Ionicons name="bulb-outline" size={rf(18)} color={colors.primary} />
          <Text style={styles.sectionTitle}>Recommendations</Text>
        </View>
        {recommendations.map((recommendation) => (
          <View key={recommendation} style={styles.recommendationItem}>
            <Text style={styles.recommendationText}>• {recommendation}</Text>
          </View>
        ))}
      </View>
    )}

    {alternatives && alternatives.length > 0 && (
      <View style={styles.alternativesContainer}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="swap-horizontal" size={rf(18)} color={colors.success} />
          <Text style={styles.sectionTitle}>Healthier Alternatives</Text>
        </View>
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
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold as '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  recommendationsContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  recommendationItem: {
    marginBottom: spacing.sm,
  },
  recommendationText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
  alternativesContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  alternativeItem: {
    marginBottom: spacing.sm,
  },
  alternativeText: {
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 20,
  },
});
