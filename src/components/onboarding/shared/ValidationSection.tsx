/**
 * ValidationSection — fresh ("Editorial Dark") validation status block.
 *
 * Replaces the aurora-era GlassCard: no container, no elevation. Status lives
 * in a color dot + typographic hierarchy; errors/warnings sit under a single
 * hairline. Accent discipline per tokens.ts: accent marks "ready", danger
 * marks blocking errors, ink2 carries non-blocking recommendations.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { tokens, type, spacing } from "../fresh/tokens";
import { TabValidationResult } from "../../../types/onboarding";

interface ValidationSectionProps {
  validationResult?: TabValidationResult;
}

export const ValidationSection: React.FC<ValidationSectionProps> = ({
  validationResult,
}) => {
  if (!validationResult) return null;

  const ready = validationResult.is_valid;
  const statusText = ready ? "Ready to continue" : "Please complete";
  const completionText =
    ready && validationResult.completion_percentage === 0
      ? "Optional"
      : `${validationResult.completion_percentage}%`;

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.headerRow}>
        <View
          style={[styles.statusDot, ready ? styles.dotReady : styles.dotDanger]}
        />
        <Text style={styles.statusText}>{statusText}</Text>
        <Text style={styles.completionText}>{completionText}</Text>
      </View>
      <View style={styles.hairline} />

      {validationResult.errors.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.listLabel}>Required</Text>
          {validationResult.errors.map((error, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {error}
              </Text>
            </View>
          ))}
        </View>
      )}

      {validationResult.warnings.length > 0 && (
        <View style={styles.list}>
          <Text style={styles.listLabel}>Recommended</Text>
          {validationResult.warnings.map((warning, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // No horizontal padding here: this section is always rendered inside
    // ScreenScaffold's ScrollView, which already applies
    // paddingHorizontal: spacing.screenPad to its content container.
    marginBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.m,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.s,
  },
  dotReady: {
    backgroundColor: tokens.accent,
  },
  dotDanger: {
    backgroundColor: tokens.danger,
  },
  statusText: {
    ...type.value,
    flex: 1,
  },
  completionText: {
    ...type.valueLg,
    color: tokens.ink2,
  },
  hairline: {
    height: spacing.hair,
    backgroundColor: tokens.hairline,
  },
  list: {
    paddingTop: spacing.s,
  },
  listLabel: {
    ...type.sectionLabel,
    marginBottom: spacing.xs,
  },
  itemRow: {
    paddingVertical: spacing.xs,
  },
  errorText: {
    ...type.body,
    color: tokens.danger,
  },
  warningText: {
    ...type.body,
  },
});
