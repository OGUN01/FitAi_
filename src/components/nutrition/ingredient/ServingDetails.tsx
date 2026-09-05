import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../../theme/aurora-tokens";
import { rbr } from "../../../utils/responsive";
import { MealItem } from "../../../types/ai";
import { fontFamilyForWeight } from "../../../theme/fonts";

interface ServingDetailsProps {
  ingredientData: MealItem;
}

export const ServingDetails: React.FC<ServingDetailsProps> = ({
  ingredientData,
}) => {
  return (
    <View style={styles.quantityCard}>
      <Text style={styles.sectionTitle}>Serving Details</Text>
      <View style={styles.quantityInfo}>
        <Text style={styles.quantityText}>
          📏 Quantity: {ingredientData.quantity}{" "}
          {ingredientData.unit || "grams"}
        </Text>
        <Text style={styles.quantityText}>
          ⚖️ Calories per 100g:{" "}
          {(() => {
            const qty = Number(ingredientData.quantity);
            const calsPerUnit = qty > 0 ? (ingredientData.calories / qty) * 100 : null;
            return calsPerUnit != null ? Math.round(calsPerUnit * 100) / 100 : '—';
          })()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quantityCard: {
    backgroundColor: colors.surface,
    borderRadius: rbr(16),
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontFamily: fontFamilyForWeight("bold"),
    color: colors.text,
    marginBottom: spacing.md,
  },
  quantityInfo: {
    gap: spacing.sm,
  },
  quantityText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
});
