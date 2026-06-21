import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../../theme/aurora-tokens";

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
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  quickPortionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  quickPortionButton: {
    flex: 1,
    minWidth: "45%",
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center" as const,
  },
  quickPortionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickPortionLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  quickPortionLabelActive: {
    color: colors.white,
  },
  quickPortionGrams: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  quickPortionGramsActive: {
    color: colors.white,
  },
});
