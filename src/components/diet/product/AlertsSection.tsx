import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography, colors as nestedColors } from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";
import { hexToRgba, TINT_ALPHA_LOW } from "../../../utils/colors";

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
        <View style={styles.sectionTitleRow}>
          <Ionicons name="warning-outline" size={rf(18)} color={colors.error} />
          <Text style={styles.sectionTitle}>Health Alerts</Text>
        </View>
        {alerts.map((alert) => (
          <View key={alert} style={styles.alertItem}>
            <Text style={styles.alertText}>{alert}</Text>
          </View>
        ))}
      </View>
    )}

    {benefits && benefits.length > 0 && (
      <View style={styles.benefitsContainer}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="checkmark-circle-outline" size={rf(18)} color={colors.success} />
          <Text style={styles.sectionTitle}>Health Benefits</Text>
        </View>
        {benefits.map((benefit) => (
          <View key={benefit} style={styles.benefitItem}>
            <Text style={styles.benefitText}>• {benefit}</Text>
          </View>
        ))}
      </View>
    )}

    {concerns && concerns.length > 0 && (
      <View style={styles.concernsContainer}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="alert-circle-outline" size={rf(18)} color={nestedColors.warning.DEFAULT} />
          <Text style={styles.sectionTitle}>Concerns</Text>
        </View>
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
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  alertsContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  alertItem: {
    backgroundColor: hexToRgba(colors.error, TINT_ALPHA_LOW),
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
