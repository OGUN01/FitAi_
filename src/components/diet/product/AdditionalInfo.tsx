import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import type { ScannedProduct } from "../../../services/barcodeService";

interface AdditionalInfoProps {
  additionalInfo?: ScannedProduct["additionalInfo"];
}

export const AdditionalInfo: React.FC<AdditionalInfoProps> = ({
  additionalInfo,
}) => {
  if (
    !additionalInfo ||
    (!additionalInfo.ingredients?.length &&
      !additionalInfo.allergens?.length &&
      !additionalInfo.labels?.length)
  ) {
    return null;
  }

  return (
    <View style={styles.additionalInfoContainer}>
      <Text style={styles.sectionTitle}>Additional Information</Text>

      {additionalInfo.ingredients && additionalInfo.ingredients.length > 0 && (
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Ingredients:</Text>
          <Text style={styles.infoText}>
            {additionalInfo.ingredients.join(", ")}
          </Text>
        </View>
      )}

      {additionalInfo.allergens && additionalInfo.allergens.length > 0 && (
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Allergens:</Text>
          <Text style={styles.alertText}>
            {additionalInfo.allergens.join(", ")}
          </Text>
        </View>
      )}

      {additionalInfo.labels && additionalInfo.labels.length > 0 && (
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Labels:</Text>
          <Text style={styles.infoText}>
            {additionalInfo.labels.join(", ")}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  additionalInfoContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold as "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoSection: {
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  alertText: {
    fontSize: fontSize.sm,
    color: "#dc2626",
  },
});
