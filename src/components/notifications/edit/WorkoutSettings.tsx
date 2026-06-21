import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';

interface WorkoutSettingsProps {
  reminderMinutes: string;
  setReminderMinutes: (value: string) => void;
}

export const WorkoutSettings: React.FC<WorkoutSettingsProps> = ({
  reminderMinutes,
  setReminderMinutes,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Workout Reminder Time</Text>
      <Text style={styles.sectionDescription}>
        How many minutes before your scheduled workout should you be reminded?
      </Text>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>Minutes Before Workout</Text>
          <TextInput
            style={styles.textInput}
            value={reminderMinutes}
            onChangeText={setReminderMinutes}
            placeholder="30"
            keyboardType="number-pad"
            selectTextOnFocus
          />
        </View>

        <View style={styles.presetButtons}>
          {[15, 30, 45, 60].map((minutes) => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.presetButton,
                reminderMinutes === minutes.toString() &&
                  styles.presetButtonActive,
              ]}
              onPress={() => setReminderMinutes(minutes.toString())}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  reminderMinutes === minutes.toString() &&
                    styles.presetButtonTextActive,
                ]}
              >
                {minutes}min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoText}>
          💡 Workout times are automatically detected from your AI-generated
          fitness plans. You can also manually set custom workout times in the
          fitness section.
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
    fontWeight: typography.fontWeight.semibold as "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardContent: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium as "500",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center" as const,
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  presetButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium as "500",
  },
  presetButtonTextActive: {
    color: colors.primary,
  },
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.backgroundTertiary,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
