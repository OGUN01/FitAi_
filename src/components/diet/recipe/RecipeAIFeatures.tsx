import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../ui";
import { ResponsiveTheme } from "../../../utils/constants";
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
    margin: ResponsiveTheme.spacing.lg,
    padding: ResponsiveTheme.spacing.lg,
  },

  aiTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  aiFeatures: {
    gap: ResponsiveTheme.spacing.xs,
  },

  aiFeature: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
});
