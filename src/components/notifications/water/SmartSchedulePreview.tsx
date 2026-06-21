import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';

interface SmartSchedulePreviewProps {
  awakeHours: number;
  dailyGoal: string;
  reminderFrequency: string;
}

export const SmartSchedulePreview: React.FC<SmartSchedulePreviewProps> = ({
  awakeHours,
  dailyGoal,
  reminderFrequency,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Smart Schedule Preview</Text>
      <Card style={styles.previewCard}>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Awake Hours:</Text>
          <Text style={styles.previewValue}>{awakeHours}h</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Daily Goal:</Text>
          <Text style={styles.previewValue}>{dailyGoal}L</Text>
        </View>
        <View style={styles.previewRow}>
          <Text style={styles.previewLabel}>Reminder Frequency:</Text>
          <Text style={styles.previewValue}>{reminderFrequency}</Text>
        </View>
        <Text style={styles.previewNote}>
          💡 Reminders are distributed intelligently: more frequent in
          morning/afternoon, less in evening.
        </Text>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  previewCard: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundTertiary,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  previewLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },
  previewValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.semibold,
  },
  previewNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: "italic",
    lineHeight: 16,
  },
});
