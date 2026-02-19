import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "../../ui";
import { ResponsiveTheme } from "../../../utils/constants";

interface QuickPortionsCardProps {
  commonPortions: { label: string; grams: number }[];
  currentGrams: number;
  currentFoodIndex: number;
  updateAdjustment: (index: number, adjustedGrams: number) => void;
}

export const QuickPortionsCard: React.FC<QuickPortionsCardProps> = ({
  commonPortions,
  currentGrams,
  currentFoodIndex,
  updateAdjustment,
}) => {
  return (
    <Card style={styles.quickPortionsCard}>
      <Text style={styles.sectionTitle}>Common Portions</Text>
      <View style={styles.quickPortionsGrid}>
        {commonPortions.map((portion, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.quickPortionButton,
              currentGrams === portion.grams && styles.quickPortionButtonActive,
            ]}
            onPress={() => updateAdjustment(currentFoodIndex, portion.grams)}
          >
            <Text
              style={[
                styles.quickPortionLabel,
                currentGrams === portion.grams &&
                  styles.quickPortionLabelActive,
              ]}
            >
              {portion.label}
            </Text>
            <Text
              style={[
                styles.quickPortionGrams,
                currentGrams === portion.grams &&
                  styles.quickPortionGramsActive,
              ]}
            >
              {portion.grams}g
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  quickPortionsCard: {
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  quickPortionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
  },
  quickPortionButton: {
    flex: 1,
    minWidth: "45%",
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    backgroundColor: ResponsiveTheme.colors.background,
    alignItems: "center" as const,
  },
  quickPortionButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  quickPortionLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: "600",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  quickPortionLabelActive: {
    color: ResponsiveTheme.colors.white,
  },
  quickPortionGrams: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
  quickPortionGramsActive: {
    color: ResponsiveTheme.colors.white,
  },
});
