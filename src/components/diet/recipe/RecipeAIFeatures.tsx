import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../../../theme/aurora-tokens';
import { rf } from '../../../utils/responsive';

export const RecipeAIFeatures: React.FC = () => {
  return (
    <View style={styles.aiCard}>
      <View style={styles.aiTitleRow}>
        <Ionicons name="sparkles" size={rf(18)} color={colors.primary} />
        <Text style={styles.aiTitle}>AI Recipe Intelligence</Text>
      </View>
      <View style={styles.aiFeatures}>
        <Text style={styles.aiFeature}>• Personalized to your profile</Text>
        <Text style={styles.aiFeature}>• Accurate nutrition calculations</Text>
        <Text style={styles.aiFeature}>• Step-by-step instructions</Text>
        <Text style={styles.aiFeature}>• Cooking tips and variations</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  aiCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  aiTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  aiFeatures: {
    gap: spacing.xs,
  },

  aiFeature: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(18),
  },
});
