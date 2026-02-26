import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
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
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  infoSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  infoTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  infoText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: 18,
  },
  alertText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: "#dc2626",
  },
});
