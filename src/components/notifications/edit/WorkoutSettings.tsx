import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Card, THEME } from "../../ui";

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
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold as "600",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  sectionDescription: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 20,
  },
  card: {
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  cardContent: {
    marginBottom: THEME.spacing.md,
  },
  inputLabel: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium as "500",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.backgroundSecondary,
  },
  presetButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: THEME.spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: THEME.colors.backgroundSecondary,
    alignItems: "center" as const,
  },
  presetButtonActive: {
    borderColor: THEME.colors.primary,
    backgroundColor: THEME.colors.primary + "20",
  },
  presetButtonText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium as "500",
  },
  presetButtonTextActive: {
    color: THEME.colors.primary,
  },
  infoCard: {
    padding: THEME.spacing.lg,
    backgroundColor: THEME.colors.backgroundTertiary,
  },
  infoText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    fontStyle: "italic",
  },
});
