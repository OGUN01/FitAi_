import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
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
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  infoSection: {
    marginBottom: THEME.spacing.md,
  },
  infoTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.xs,
  },
  infoText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
  },
  alertText: {
    fontSize: THEME.fontSize.sm,
    color: "#dc2626",
  },
});
