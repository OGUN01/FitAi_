import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography, colors as nestedColors } from "../../../theme/aurora-tokens";

interface AlertsSectionProps {
  alerts?: string[];
  benefits?: string[];
  concerns?: string[];
}

export const AlertsSection: React.FC<AlertsSectionProps> = ({
  alerts,
  benefits,
  concerns,
}) => (
  <>
    {alerts && alerts.length > 0 && (
      <View style={styles.alertsContainer}>
        <Text style={styles.sectionTitle}>⚠️ Health Alerts</Text>
        {alerts.map((alert) => (
          <View key={alert} style={styles.alertItem}>
            <Text style={styles.alertText}>{alert}</Text>
          </View>
        ))}
      </View>
    )}

    {benefits && benefits.length > 0 && (
      <View style={styles.benefitsContainer}>
        <Text style={styles.sectionTitle}>✅ Health Benefits</Text>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitItem}>
            <Text style={styles.benefitText}>• {benefit}</Text>
          </View>
        ))}
      </View>
    )}

    {concerns && concerns.length > 0 && (
      <View style={styles.concernsContainer}>
        <Text style={styles.sectionTitle}>⚠️ Concerns</Text>
        {concerns.map((concern) => (
          <View key={concern} style={styles.concernItem}>
            <Text style={styles.concernText}>• {concern}</Text>
          </View>
        ))}
      </View>
    )}
  </>
);

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold as "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  alertsContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  alertItem: {
    backgroundColor: "rgba(244, 67, 54, 0.12)",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    marginBottom: spacing.sm,
  },
  alertText: {
    fontSize: fontSize.sm,
    color: colors.errorLight,
  },
  benefitsContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  benefitItem: {
    marginBottom: spacing.sm,
  },
  benefitText: {
    fontSize: fontSize.sm,
    color: colors.successLight,
    lineHeight: 20,
  },
  concernsContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  concernItem: {
    marginBottom: spacing.sm,
  },
  concernText: {
    fontSize: fontSize.sm,
    color: nestedColors.warning.light,
    lineHeight: 20,
  },
});
