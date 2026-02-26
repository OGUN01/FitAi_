import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card } from "../../ui";
import { ResponsiveTheme } from '../../../utils/constants';

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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  previewCard: {
    padding: ResponsiveTheme.spacing.lg,
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  previewLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
  previewValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  previewNote: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginTop: ResponsiveTheme.spacing.sm,
    fontStyle: "italic",
    lineHeight: 16,
  },
});
