import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
} from "react-native";
import { Card } from "../../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../../theme/aurora-tokens';

interface SleepSettingsProps {
  bedtime: string;
  setBedtime: (value: string) => void;
  reminderMinutes: string;
  setReminderMinutes: (value: string) => void;
}

export const SleepSettings: React.FC<SleepSettingsProps> = ({
  bedtime,
  setBedtime,
  reminderMinutes,
  setReminderMinutes,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Sleep Reminder Settings</Text>
      <Text style={styles.sectionDescription}>
        Set your bedtime and when to be reminded to start winding down.
      </Text>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>Bedtime</Text>
          <TextInput
            style={styles.textInput}
            value={bedtime}
            onChangeText={setBedtime}
            placeholder="22:30"
            keyboardType={
              Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
            }
          />
        </View>
        <View style={styles.presetButtons}>
          {["21:30", "22:00", "22:30", "23:00"].map((time) => (
            <TouchableOpacity
              key={time}
              style={[
                styles.presetButton,
                bedtime === time && styles.presetButtonActive,
              ]}
              onPress={() => setBedtime(time)}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  bedtime === time && styles.presetButtonTextActive,
                ]}
              >
                {time}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Text style={styles.inputLabel}>
            Wind Down Reminder (minutes before)
          </Text>
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
          🌙 You'll receive two notifications: one to start winding down, and
          another at bedtime. Quality sleep is essential for recovery and
          performance.
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
