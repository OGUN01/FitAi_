import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";

export const RecipeAIFeatures: React.FC = () => {
  return (
    <Card style={styles.aiCard} variant="outlined">
      <Text style={styles.aiTitle}>🤖 AI Recipe Intelligence</Text>
      <View style={styles.aiFeatures}>
        <Text style={styles.aiFeature}>• Personalized to your profile</Text>
        <Text style={styles.aiFeature}>• Accurate nutrition calculations</Text>
        <Text style={styles.aiFeature}>• Step-by-step instructions</Text>
        <Text style={styles.aiFeature}>• Cooking tips and variations</Text>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  aiCard: {
    margin: spacing.lg,
    padding: spacing.lg,
  },

  aiTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
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
