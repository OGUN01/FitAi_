import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Card, THEME } from "../../ui";

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
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  previewCard: {
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: THEME.spacing.sm,
  },
  previewLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },
  previewValue: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.semibold,
  },
  previewNote: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    marginTop: THEME.spacing.sm,
    fontStyle: "italic",
    lineHeight: 16,
  },
});
