import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { colors } from "../../../theme/aurora-tokens";

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
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  alertsContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  alertItem: {
    backgroundColor: "rgba(244, 67, 54, 0.12)",
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error.DEFAULT,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  alertText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: colors.error.light,
  },
  benefitsContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  benefitItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  benefitText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: colors.success.light,
    lineHeight: 20,
  },
  concernsContainer: {
    padding: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  concernItem: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  concernText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: colors.warning.light,
    lineHeight: 20,
  },
});
