import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
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
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold as "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  alertsContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  alertItem: {
    backgroundColor: "rgba(244, 67, 54, 0.12)",
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.error.DEFAULT,
    marginBottom: THEME.spacing.sm,
  },
  alertText: {
    fontSize: THEME.fontSize.sm,
    color: colors.error.light,
  },
  benefitsContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  benefitItem: {
    marginBottom: THEME.spacing.sm,
  },
  benefitText: {
    fontSize: THEME.fontSize.sm,
    color: colors.success.light,
    lineHeight: 20,
  },
  concernsContainer: {
    padding: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  concernItem: {
    marginBottom: THEME.spacing.sm,
  },
  concernText: {
    fontSize: THEME.fontSize.sm,
    color: colors.warning.light,
    lineHeight: 20,
  },
});
